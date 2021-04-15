/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { isLeft } from 'fp-ts/lib/Either';
import { flatten } from 'lodash';
import { AlertInstance } from '../../../../alerting/server';
import { ActionVariable, AlertInstanceState } from '../../../../alerting/common';
import { RuleParams, RuleType } from '../../types';
import { DefaultFieldMap } from '../defaults/field_map';
import { OutputOfFieldMap } from '../field_map/runtime_type_from_fieldmap';
import { RuleRegistry } from '..';
import {
  generateEventsFromAlerts,
  UserDefinedAlertFields,
} from './lib/generate_events_from_alerts';

type ThresholdAlertService<
  TFieldMap extends DefaultFieldMap,
  TActionVariable extends ActionVariable
> = (data: {
  id: string;
  fields: UserDefinedAlertFields<TFieldMap>;
}) => AlertInstance<AlertInstanceState, { [key in TActionVariable['name']]: any }, string>;

type ThresholdMetricService<TFieldMap extends DefaultFieldMap> = (data: {
  id: string;
  fields: UserDefinedAlertFields<TFieldMap>;
}) => void;

type ThresholdEventsService<TFieldMap extends DefaultFieldMap> = (data: {
  id: string;
  fields: UserDefinedAlertFields<TFieldMap>;
  events: any[];
}) => void;

type CreateThresholdRuleType<TFieldMap extends DefaultFieldMap> = <
  TRuleParams extends RuleParams,
  TActionVariable extends ActionVariable
>(
  type: RuleType<
    TFieldMap,
    TRuleParams,
    TActionVariable,
    {
      writeRuleAlert: ThresholdAlertService<TFieldMap, TActionVariable>;
      writeRuleMetric: ThresholdMetricService<TFieldMap>;
      writeRuleEvents: ThresholdEventsService<TFieldMap>;
    }
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

export function createThresholdRuleTypeFactory<
  TRuleRegistry extends RuleRegistry<DefaultFieldMap>
>(): TRuleRegistry extends RuleRegistry<infer TFieldMap>
  ? CreateThresholdRuleType<TFieldMap>
  : never;

export function createThresholdRuleTypeFactory(): CreateThresholdRuleType<DefaultFieldMap> {
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
          UserDefinedAlertFields<DefaultFieldMap> & { 'kibana.rac.alert.id': string }
        > = {};

        const currentMetrics: Record<
          string,
          UserDefinedAlertFields<DefaultFieldMap> & { 'kibana.rac.alert.id': string }
        > = {};

        const currentEvents: Record<
          string,
          Array<UserDefinedAlertFields<DefaultFieldMap> & { 'kibana.rac.alert.id': string }>
        > = {};

        const timestamp = options.startedAt.toISOString();

        const nextWrappedState = await type.executor({
          ...options,
          state: state.wrapped,
          services: {
            ...options.services,
            writeRuleAlert: ({ id, fields }) => {
              // currentAlerts[id] = {
              //   ...fields,
              //   'kibana.rac.alert.id': id,
              // };
              return alertInstanceFactory(id);
            },
            writeRuleMetric: ({ id, fields }) => {
              currentMetrics[id] = {
                ...fields,
                'kibana.rac.alert.id': id,
              };
            },
            writeRuleEvents: ({ id, fields, events }) => {
              currentEvents[id] = (events || []).map((event) => ({
                ...event._source,
                ...fields,
                'kibana.rac.alert.id': `${id}-${event._id}`,
              }));
            },
          },
        });

        const { eventsToIndex: alertsToIndex, alertsToTrack } = await generateEventsFromAlerts({
          logger,
          ruleUuid: rule.uuid,
          startedAt: options.startedAt,
          scopedRuleRegistryClient,
          currentAlerts,
          trackedAlerts: state.trackedAlerts,
          lifecycleEventMap: {
            'event.kind': 'alert',
            new: {
              'event.action': 'new',
            },
            recovered: {
              'event.action': 'recovered',
              'kibana.rac.alert.status': 'recovered',
            },
            active: {
              'event.action': 'active',
              'kibana.rac.alert.status': 'active',
            },
          },
        });

        const metricsToIndex: Array<OutputOfFieldMap<DefaultFieldMap>> = Object.keys(
          currentMetrics
        ).map((alertId) => {
          const alertData = currentMetrics[alertId];

          if (!alertData) {
            logger.warn(`Could not find alert data for ${alertId}`);
          }

          return {
            ...alertData,
            '@timestamp': timestamp,
            'event.kind': 'metric',
            'kibana.rac.alert.id': alertId,
          };
        });

        const eventsToIndex: Array<OutputOfFieldMap<DefaultFieldMap>> = flatten(
          Object.keys(currentEvents).map((alertId) => {
            const alertData = currentEvents[alertId];

            if (!alertData) {
              logger.warn(`Could not find alert data for ${alertId}`);
            }

            return alertData.map((data) => ({
              ...data,
              '@timestamp': options.startedAt.toISOString(),
              'event.kind': 'event',
            }));
          })
        );

        const toIndex = [...alertsToIndex, ...metricsToIndex, ...eventsToIndex];

        if (toIndex.length && scopedRuleRegistryClient) {
          await scopedRuleRegistryClient.bulkIndex(toIndex);
        }

        return {
          wrapped: nextWrappedState,
          trackedAlerts: alertsToTrack,
        };
      },
    };
  };
}
