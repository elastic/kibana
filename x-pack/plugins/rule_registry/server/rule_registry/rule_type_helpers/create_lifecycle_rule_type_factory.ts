/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { isLeft } from 'fp-ts/lib/Either';
import v4 from 'uuid/v4';
import { AlertInstance } from '../../../../alerting/server';
import { ActionVariable, AlertInstanceState } from '../../../../alerting/common';
import { RuleParams, RuleType } from '../../types';
import { DefaultFieldMap } from '../defaults/field_map';
import { OutputOfFieldMap } from '../field_map/runtime_type_from_fieldmap';
import { PrepopulatedRuleEventFields } from '../create_scoped_rule_registry_client/types';
import { RuleRegistry } from '..';

type UserDefinedAlertFields<TFieldMap extends DefaultFieldMap> = Omit<
  OutputOfFieldMap<TFieldMap>,
  PrepopulatedRuleEventFields | 'alert.id' | 'alert.uuid' | '@timestamp'
>;

type LifecycleAlertService<
  TFieldMap extends DefaultFieldMap,
  TActionVariable extends ActionVariable
> = (alert: {
  id: string;
  fields: UserDefinedAlertFields<TFieldMap>;
}) => AlertInstance<AlertInstanceState, { [key in TActionVariable['name']]: any }, string>;

type CreateLifecycleRuleType<TFieldMap extends DefaultFieldMap> = <
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
  started: t.number,
});

const wrappedStateRt = t.type({
  wrapped: t.record(t.string, t.unknown),
  trackedAlerts: t.record(t.string, trackedAlertStateRt),
});

export function createLifecycleRuleTypeFactory<
  TRuleRegistry extends RuleRegistry<DefaultFieldMap>
>(): TRuleRegistry extends RuleRegistry<infer TFieldMap>
  ? CreateLifecycleRuleType<TFieldMap>
  : never;

export function createLifecycleRuleTypeFactory(): CreateLifecycleRuleType<DefaultFieldMap> {
  return (type) => {
    return {
      ...type,
      executor: async (options) => {
        const {
          services: { scopedRuleRegistryClient, alertInstanceFactory },
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
          UserDefinedAlertFields<DefaultFieldMap> & { 'alert.id': string }
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
                'alert.id': id,
              };
              return alertInstanceFactory(id);
            },
          },
        });

        const currentAlertIds = Object.keys(currentAlerts);
        const trackedAlertIds = Object.keys(state.trackedAlerts);

        const allAlertIds = [...new Set(currentAlertIds.concat(trackedAlertIds))];

        const trackedAlertStatesOfRecovered = Object.values(state.trackedAlerts).filter(
          (trackedAlertState) => currentAlerts[trackedAlertState.alertId]
        );

        const alertsDataMap: Record<string, UserDefinedAlertFields<DefaultFieldMap>> = {
          ...currentAlerts,
        };

        if (trackedAlertStatesOfRecovered.length) {
          const { events } = await scopedRuleRegistryClient.search({
            body: {
              query: {
                bool: {
                  filter: [
                    {
                      term: {
                        'rule.id': rule.id,
                      },
                    },
                    {
                      terms: {
                        'alert.uuid': trackedAlertStatesOfRecovered.map(
                          (trackedAlertState) => trackedAlertState.alertUuid
                        ),
                      },
                    },
                  ],
                },
              },
              size: trackedAlertStatesOfRecovered.length,
              collapse: {
                field: 'alert.uuid',
              },
              _source: false,
              fields: ['*'],
              sort: {
                '@timestamp': 'desc' as const,
              },
            },
          });

          events.forEach((event) => {
            const alertId = event['alert.id']!;
            alertsDataMap[alertId] = event;
          });
        }

        const eventsToIndex: Array<OutputOfFieldMap<DefaultFieldMap>> = allAlertIds.map(
          (alertId) => {
            const alertData = alertsDataMap[alertId];

            const event: OutputOfFieldMap<DefaultFieldMap> = {
              ...alertData,
              '@timestamp': timestamp,
              'event.kind': 'state',
              'alert.id': alertId,
            };

            const isNew = !state.trackedAlerts[alertId];
            const isRecovered = !currentAlerts[alertId];
            const isActiveButNotNew = !isNew && !isRecovered;
            const isActive = !isRecovered;

            if (isNew) {
              event['alert.uuid'] = v4();
              event['alert.start'] = timestamp;
              event['event.action'] = 'open';
            }

            if (isRecovered) {
              event['alert.end'] = timestamp;
              event['event.action'] = 'close';
              event['alert.status'] = 'closed';
            }

            if (isActiveButNotNew) {
              event['event.action'] = 'active';
            }

            if (isActive) {
              event['alert.status'] = 'open';
            }

            event['alert.duration.us'] =
              (options.startedAt.getTime() - new Date(event['alert.start']!).getTime()) * 1000;

            return event;
          }
        );

        await scopedRuleRegistryClient.bulkIndex(eventsToIndex);

        return {
          wrapped: nextWrappedState,
          trackedAlerts: eventsToIndex,
        };
      },
    };
  };
}
