/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { getOrElse } from 'fp-ts/lib/Either';
import * as rt from 'io-ts';
import { Mutable } from 'utility-types';
import { v4 } from 'uuid';
import {
  AlertExecutorOptions,
  AlertInstance,
  AlertInstanceContext,
  AlertInstanceState,
  AlertTypeParams,
  AlertTypeState,
} from '../../../alerting/server';
import { ParsedTechnicalFields, parseTechnicalFields } from '../../common/parse_technical_fields';
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
import { RuleDataClient } from '../rule_data_client';
import { AlertExecutorOptionsWithExtraServices } from '../types';
import { getRuleData } from './get_rule_executor_data';

type LifecycleAlertService<
  InstanceState extends AlertInstanceState = never,
  InstanceContext extends AlertInstanceContext = never,
  ActionGroupIds extends string = never
> = (alert: {
  id: string;
  fields: Record<string, unknown>;
}) => AlertInstance<InstanceState, InstanceContext, ActionGroupIds>;

export interface LifecycleAlertServices<
  InstanceState extends AlertInstanceState = never,
  InstanceContext extends AlertInstanceContext = never,
  ActionGroupIds extends string = never
> {
  alertWithLifecycle: LifecycleAlertService<InstanceState, InstanceContext, ActionGroupIds>;
}

export type LifecycleRuleExecutor<
  Params extends AlertTypeParams = never,
  State extends AlertTypeState = never,
  InstanceState extends AlertInstanceState = never,
  InstanceContext extends AlertInstanceContext = never,
  ActionGroupIds extends string = never
> = (
  options: AlertExecutorOptionsWithExtraServices<
    Params,
    State,
    InstanceState,
    InstanceContext,
    ActionGroupIds,
    LifecycleAlertServices<InstanceState, InstanceContext, ActionGroupIds>
  >
) => Promise<State | void>;

const trackedAlertStateRt = rt.type({
  alertId: rt.string,
  alertUuid: rt.string,
  started: rt.string,
});

export type TrackedLifecycleAlertState = rt.TypeOf<typeof trackedAlertStateRt>;

const alertTypeStateRt = <State extends AlertTypeState>() =>
  rt.record(rt.string, rt.unknown) as rt.Type<State, State, unknown>;

const wrappedStateRt = <State extends AlertTypeState>() =>
  rt.type({
    wrapped: alertTypeStateRt<State>(),
    trackedAlerts: rt.record(rt.string, trackedAlertStateRt),
  });

/**
 * This is redefined instead of derived from above `wrappedStateRt` because
 * there's no easy way to instantiate generic values such as the runtime type
 * factory function.
 */
export type WrappedLifecycleRuleState<State extends AlertTypeState> = AlertTypeState & {
  wrapped: State | void;
  trackedAlerts: Record<string, TrackedLifecycleAlertState>;
};

export const createLifecycleExecutor = (logger: Logger, ruleDataClient: RuleDataClient) => <
  Params extends AlertTypeParams = never,
  State extends AlertTypeState = never,
  InstanceState extends AlertInstanceState = never,
  InstanceContext extends AlertInstanceContext = never,
  ActionGroupIds extends string = never
>(
  wrappedExecutor: LifecycleRuleExecutor<
    Params,
    State,
    InstanceState,
    InstanceContext,
    ActionGroupIds
  >
) => async (
  options: AlertExecutorOptions<
    Params,
    WrappedLifecycleRuleState<State>,
    InstanceState,
    InstanceContext,
    ActionGroupIds
  >
): Promise<WrappedLifecycleRuleState<State>> => {
  const {
    rule,
    services: { alertInstanceFactory },
    state: previousState,
  } = options;

  const ruleExecutorData = getRuleData(options);

  const state = getOrElse(
    (): WrappedLifecycleRuleState<State> => ({
      wrapped: previousState as State,
      trackedAlerts: {},
    })
  )(wrappedStateRt<State>().decode(previousState));

  const currentAlerts: Record<string, { [ALERT_ID]: string }> = {};

  const timestamp = options.startedAt.toISOString();

  const lifecycleAlertServices: LifecycleAlertServices<
    InstanceState,
    InstanceContext,
    ActionGroupIds
  > = {
    alertWithLifecycle: ({ id, fields }) => {
      currentAlerts[id] = {
        ...fields,
        [ALERT_ID]: id,
      };
      return alertInstanceFactory(id);
    },
  };

  const nextWrappedState = await wrappedExecutor({
    ...options,
    state: state.wrapped != null ? state.wrapped : ({} as State),
    services: {
      ...options.services,
      ...lifecycleAlertServices,
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
    wrapped: nextWrappedState ?? ({} as State),
    trackedAlerts: ruleDataClient.isWriteEnabled() ? nextTrackedAlerts : {},
  };
};
