/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger } from '@kbn/logging';
import { isLeft } from 'fp-ts/lib/Either';
import * as t from 'io-ts';
import { Mutable } from 'utility-types';
import v4 from 'uuid/v4';
import { AlertInstance } from '../../../alerting/server';
import { RuleDataClient } from '..';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertTypeParams,
} from '../../../alerting/common';
import {
  ALERT_DURATION,
  ALERT_END,
  ALERT_ID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_UUID,
  EVENT_ACTION,
  EVENT_KIND,
  OWNER,
  RULE_UUID,
  TIMESTAMP,
} from '../../common/technical_rule_data_field_names';
import { AlertTypeWithExecutor } from '../types';
import { ParsedTechnicalFields, parseTechnicalFields } from '../../common/parse_technical_fields';
import { getRuleExecutorData } from './get_rule_executor_data';

export type LifecycleAlertService<TAlertInstanceContext extends Record<string, unknown>> = (alert: {
  id: string;
  fields: Record<string, unknown>;
}) => AlertInstance<AlertInstanceState, TAlertInstanceContext, string>;

const trackedAlertStateRt = t.type({
  alertId: t.string,
  alertUuid: t.string,
  started: t.string,
});

const wrappedStateRt = t.type({
  wrapped: t.record(t.string, t.unknown),
  trackedAlerts: t.record(t.string, trackedAlertStateRt),
});

type CreateLifecycleRuleTypeFactory = (options: {
  ruleDataClient: RuleDataClient;
  logger: Logger;
}) => <
  TParams extends AlertTypeParams,
  TAlertInstanceContext extends AlertInstanceContext,
  TServices extends { alertWithLifecycle: LifecycleAlertService<TAlertInstanceContext> }
>(
  type: AlertTypeWithExecutor<TParams, TAlertInstanceContext, TServices>
) => AlertTypeWithExecutor<TParams, TAlertInstanceContext, any>;

export const createLifecycleRuleTypeFactory: CreateLifecycleRuleTypeFactory = ({
  logger,
  ruleDataClient,
}) => (type) => {
  return {
    ...type,
    executor: async (options) => {
      const {
        services: { alertInstanceFactory },
        state: previousState,
        rule,
      } = options;

      const ruleExecutorData = getRuleExecutorData(type, options);

      const decodedState = wrappedStateRt.decode(previousState);

      const state = isLeft(decodedState)
        ? {
            wrapped: previousState,
            trackedAlerts: {},
          }
        : decodedState.right;

      const currentAlerts: Record<string, { [ALERT_ID]: string }> = {};

      const timestamp = options.startedAt.toISOString();

      const nextWrappedState = await type.executor({
        ...options,
        state: state.wrapped,
        services: {
          ...options.services,
          alertWithLifecycle: ({ id, fields }) => {
            currentAlerts[id] = {
              ...fields,
              [ALERT_ID]: id,
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

      const alertsDataMap: Record<
        string,
        {
          [ALERT_ID]: string;
        }
      > = {
        ...currentAlerts,
      };

      if (trackedAlertStatesOfRecovered.length) {
        const { hits } = await ruleDataClient.getReader().search({
          body: {
            query: {
              bool: {
                filter: [
                  {
                    term: {
                      [RULE_UUID]: ruleExecutorData[RULE_UUID],
                    },
                  },
                  {
                    terms: {
                      [ALERT_UUID]: trackedAlertStatesOfRecovered.map(
                        (trackedAlertState) => trackedAlertState.alertUuid
                      ),
                    },
                  },
                ],
              },
            },
            size: trackedAlertStatesOfRecovered.length,
            collapse: {
              field: ALERT_UUID,
            },
            _source: false,
            fields: [{ field: '*', include_unmapped: true }],
            sort: {
              [TIMESTAMP]: 'desc' as const,
            },
          },
          allow_no_indices: true,
        });

        hits.hits.forEach((hit) => {
          const fields = parseTechnicalFields(hit.fields);
          const alertId = fields[ALERT_ID]!;
          alertsDataMap[alertId] = {
            ...fields,
            [ALERT_ID]: alertId,
          };
        });
      }

      const eventsToIndex = allAlertIds.map((alertId) => {
        const alertData = alertsDataMap[alertId];

        if (!alertData) {
          logger.warn(`Could not find alert data for ${alertId}`);
        }

        const event: Mutable<ParsedTechnicalFields> = {
          ...alertData,
          ...ruleExecutorData,
          [TIMESTAMP]: timestamp,
          [EVENT_KIND]: 'event',
          [OWNER]: rule.consumer,
          [ALERT_ID]: alertId,
        };

        const isNew = !state.trackedAlerts[alertId];
        const isRecovered = !currentAlerts[alertId];
        const isActiveButNotNew = !isNew && !isRecovered;
        const isActive = !isRecovered;

        const { alertUuid, started } = state.trackedAlerts[alertId] ?? {
          alertUuid: v4(),
          started: timestamp,
        };

        event[ALERT_START] = started;
        event[ALERT_UUID] = alertUuid;

        if (isNew) {
          event[EVENT_ACTION] = 'open';
        }

        if (isRecovered) {
          event[ALERT_END] = timestamp;
          event[EVENT_ACTION] = 'close';
          event[ALERT_STATUS] = 'closed';
        }

        if (isActiveButNotNew) {
          event[EVENT_ACTION] = 'active';
        }

        if (isActive) {
          event[ALERT_STATUS] = 'open';
        }

        event[ALERT_DURATION] =
          (options.startedAt.getTime() - new Date(event[ALERT_START]!).getTime()) * 1000;

        return event;
      });

      if (eventsToIndex.length) {
        const alertEvents: Map<string, ParsedTechnicalFields> = new Map();

        for (const event of eventsToIndex) {
          const uuid = event[ALERT_UUID]!;
          let storedEvent = alertEvents.get(uuid);
          if (!storedEvent) {
            storedEvent = event;
          }
          alertEvents.set(uuid, {
            ...storedEvent,
            [EVENT_KIND]: 'signal',
          });
        }
        logger.debug(`Preparing to index ${eventsToIndex.length} alerts.`);

        if (ruleDataClient.isWriteEnabled()) {
          await ruleDataClient.getWriter().bulk({
            body: eventsToIndex
              .flatMap((event) => [{ index: {} }, event])
              .concat(
                Array.from(alertEvents.values()).flatMap((event) => [
                  { index: { _id: event[ALERT_UUID]! } },
                  event,
                ])
              ),
          });
        }
      }

      const nextTrackedAlerts = Object.fromEntries(
        eventsToIndex
          .filter((event) => event[ALERT_STATUS] !== 'closed')
          .map((event) => {
            const alertId = event[ALERT_ID]!;
            const alertUuid = event[ALERT_UUID]!;
            const started = new Date(event[ALERT_START]!).toISOString();
            return [alertId, { alertId, alertUuid, started }];
          })
      );

      return {
        wrapped: nextWrappedState ?? {},
        trackedAlerts: ruleDataClient.isWriteEnabled() ? nextTrackedAlerts : {},
      };
    },
  };
};
