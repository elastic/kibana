/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { isLeft } from 'fp-ts/lib/Either';
import { AlertInstance } from '../../../../alerting/server';
import { ActionVariable, AlertInstanceState } from '../../../../alerting/common';
import { RuleParams, RuleType } from '../../types';
import { DefaultFieldMap } from '../defaults/field_map';
import { RuleRegistry } from '..';
import {
  generateEventsFromAlerts,
  UserDefinedAlertFields,
} from './lib/generate_events_from_alerts';

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
  started: t.string,
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

        const { eventsToIndex, alertsToTrack } = await generateEventsFromAlerts({
          logger,
          ruleUuid: rule.uuid,
          startedAt: options.startedAt,
          scopedRuleRegistryClient,
          currentAlerts,
          trackedAlerts: state.trackedAlerts,
        });

        if (eventsToIndex.length && scopedRuleRegistryClient) {
          await scopedRuleRegistryClient.bulkIndex(eventsToIndex);
        }

        return {
          wrapped: nextWrappedState,
          trackedAlerts: alertsToTrack,
        };
      },
    };
  };
}
