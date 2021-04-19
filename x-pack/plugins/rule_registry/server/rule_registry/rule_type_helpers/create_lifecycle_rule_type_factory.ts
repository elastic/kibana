/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { isLeft } from 'fp-ts/lib/Either';
import v4 from 'uuid/v4';
import { Mutable } from 'utility-types';
import { AlertInstance } from '../../../../alerting/server';
import { ActionVariable, AlertInstanceState } from '../../../../alerting/common';
import { RuleParams, RuleType } from '../../types';
import { BaseRuleFieldMap, OutputOfFieldMap } from '../../../common';
import { PrepopulatedRuleEventFields } from '../create_scoped_rule_registry_client/types';
import { RuleRegistry } from '..';

type UserDefinedAlertFields<TFieldMap extends BaseRuleFieldMap> = Omit<
  OutputOfFieldMap<TFieldMap>,
  PrepopulatedRuleEventFields | 'kibana.rac.alert.id' | 'kibana.rac.alert.uuid' | '@timestamp'
>;

type LifecycleAlertService<
  TFieldMap extends BaseRuleFieldMap,
  TActionVariable extends ActionVariable
> = (alert: {
  id: string;
  fields: UserDefinedAlertFields<TFieldMap>;
}) => AlertInstance<AlertInstanceState, { [key in TActionVariable['name']]: any }, string>;

type CreateLifecycleRuleType<TFieldMap extends BaseRuleFieldMap> = <
  TRuleParams extends RuleParams,
  TActionVariable extends ActionVariable
>(
  type: RuleType<
    TFieldMap,
    TRuleParams,
    TActionVariable,
    { alertWithLifecycle: LifecycleAlertService<TFieldMap, TActionVariable> }
  >
) => RuleType<TFieldMap, TRuleParams, TActionVariable>;

const trackedAlertStateRt = t.type({
  alertId: t.string,
  alertUuid: t.string,
  started: t.string,
});

const wrappedStateRt = t.type({
  wrapped: t.record(t.string, t.unknown),
  trackedAlerts: t.record(t.string, trackedAlertStateRt),
});

export function createLifecycleRuleTypeFactory<
  TRuleRegistry extends RuleRegistry<BaseRuleFieldMap>
>(): TRuleRegistry extends RuleRegistry<infer TFieldMap>
  ? CreateLifecycleRuleType<TFieldMap>
  : never;

export function createLifecycleRuleTypeFactory(): CreateLifecycleRuleType<BaseRuleFieldMap> {
  return (type) => {
    return {
      ...type,
      executor: async (options) => {
        const {
          services: { scopedRuleRegistryClient, alertInstanceFactory, logger },
          state: previousState,
          rule,
        } = options;

        const decodedState = wrappedStateRt.decode(previousState);

        const state = isLeft(decodedState)
          ? {
              wrapped: previousState,
              trackedAlerts: {},
            }
          : decodedState.right;

        const currentAlerts: Record<
          string,
          UserDefinedAlertFields<BaseRuleFieldMap> & { 'kibana.rac.alert.id': string }
        > = {};

        const timestamp = options.startedAt.toISOString();

        const nextWrappedState = await type.executor({
          ...options,
          state: state.wrapped,
          services: {
            ...options.services,
            alertWithLifecycle: ({ id, fields }) => {
              currentAlerts[id] = {
                ...fields,
                'kibana.rac.alert.id': id,
              };
              return alertInstanceFactory(id);
            },
          },
        });

        const currentAlertIds = Object.keys(currentAlerts);
        const trackedAlertIds = Object.keys(state.trackedAlerts);
        const newAlertIds = currentAlertIds.filter((alertId) => !trackedAlertIds.includes(alertId));

        const allAlertIds = [...new Set(currentAlertIds.concat(trackedAlertIds))];

        const trackedAlertStatesOfRecovered = Object.values(state.trackedAlerts).filter(
          (trackedAlertState) => !currentAlerts[trackedAlertState.alertId]
        );

        logger.debug(
          `Tracking ${allAlertIds.length} alerts (${newAlertIds.length} new, ${trackedAlertStatesOfRecovered.length} recovered)`
        );

        const alertsDataMap: Record<string, UserDefinedAlertFields<BaseRuleFieldMap>> = {
          ...currentAlerts,
        };

        if (scopedRuleRegistryClient && trackedAlertStatesOfRecovered.length) {
          const { events } = await scopedRuleRegistryClient.search({
            body: {
              query: {
                bool: {
                  filter: [
                    {
                      term: {
                        'rule.uuid': rule.uuid,
                      },
                    },
                    {
                      terms: {
                        'kibana.rac.alert.uuid': trackedAlertStatesOfRecovered.map(
                          (trackedAlertState) => trackedAlertState.alertUuid
                        ),
                      },
                    },
                  ],
                },
              },
              size: trackedAlertStatesOfRecovered.length,
              collapse: {
                field: 'kibana.rac.alert.uuid',
              },
              _source: false,
              fields: ['*'],
              sort: {
                '@timestamp': 'desc' as const,
              },
            },
          });

          events.forEach((event) => {
            const alertId = event['kibana.rac.alert.id']!;
            alertsDataMap[alertId] = event;
          });
        }

        const eventsToIndex: Array<OutputOfFieldMap<BaseRuleFieldMap>> = allAlertIds.map(
          (alertId) => {
            const alertData = alertsDataMap[alertId];

            if (!alertData) {
              logger.warn(`Could not find alert data for ${alertId}`);
            }

            const event: Mutable<OutputOfFieldMap<BaseRuleFieldMap>> = {
              ...alertData,
              '@timestamp': timestamp,
              'event.kind': 'state',
              'kibana.rac.alert.id': alertId,
            };

            const isNew = !state.trackedAlerts[alertId];
            const isRecovered = !currentAlerts[alertId];
            const isActiveButNotNew = !isNew && !isRecovered;
            const isActive = !isRecovered;

            const { alertUuid, started } = state.trackedAlerts[alertId] ?? {
              alertUuid: v4(),
              started: timestamp,
            };

            event['kibana.rac.alert.start'] = started;
            event['kibana.rac.alert.uuid'] = alertUuid;

            if (isNew) {
              event['event.action'] = 'open';
            }

            if (isRecovered) {
              event['kibana.rac.alert.end'] = timestamp;
              event['event.action'] = 'close';
              event['kibana.rac.alert.status'] = 'closed';
            }

            if (isActiveButNotNew) {
              event['event.action'] = 'active';
            }

            if (isActive) {
              event['kibana.rac.alert.status'] = 'open';
            }

            event['kibana.rac.alert.duration.us'] =
              (options.startedAt.getTime() - new Date(event['kibana.rac.alert.start']!).getTime()) *
              1000;

            return event;
          }
        );

        if (eventsToIndex.length && scopedRuleRegistryClient) {
          await scopedRuleRegistryClient.bulkIndex(eventsToIndex);
        }

        const nextTrackedAlerts = Object.fromEntries(
          eventsToIndex
            .filter((event) => event['kibana.rac.alert.status'] !== 'closed')
            .map((event) => {
              const alertId = event['kibana.rac.alert.id']!;
              const alertUuid = event['kibana.rac.alert.uuid']!;
              const started = new Date(event['kibana.rac.alert.start']!).toISOString();
              return [alertId, { alertId, alertUuid, started }];
            })
        );

        return {
          wrapped: nextWrappedState,
          trackedAlerts: nextTrackedAlerts,
        };
      },
    };
  };
}
