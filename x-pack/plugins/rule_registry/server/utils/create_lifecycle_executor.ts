/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { PublicContract } from '@kbn/utility-types';
import { getOrElse } from 'fp-ts/lib/Either';
import * as rt from 'io-ts';
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
  ALERT_INSTANCE_ID,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
  EVENT_ACTION,
  EVENT_KIND,
  TIMESTAMP,
  VERSION,
} from '../../common/technical_rule_data_field_names';
import { IRuleDataClient } from '../rule_data_client';
import { AlertExecutorOptionsWithExtraServices } from '../types';
import {
  CommonAlertFieldName,
  CommonAlertIdFieldName,
  getCommonAlertFields,
} from './get_common_alert_fields';

type ImplicitTechnicalFieldName = CommonAlertFieldName | CommonAlertIdFieldName;

type ExplicitTechnicalAlertFields = Partial<
  Omit<ParsedTechnicalFields, ImplicitTechnicalFieldName>
>;

type ExplicitAlertFields = Record<string, unknown> & // every field can have values of arbitrary types
  ExplicitTechnicalAlertFields; // but technical fields must obey their respective type

export type LifecycleAlertService<
  InstanceState extends AlertInstanceState = never,
  InstanceContext extends AlertInstanceContext = never,
  ActionGroupIds extends string = never
> = (alert: {
  id: string;
  fields: ExplicitAlertFields;
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

export const createLifecycleExecutor = (
  logger: Logger,
  ruleDataClient: PublicContract<IRuleDataClient>
) => <
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
    services: { alertInstanceFactory },
    state: previousState,
  } = options;

  const state = getOrElse(
    (): WrappedLifecycleRuleState<State> => ({
      wrapped: previousState as State,
      trackedAlerts: {},
    })
  )(wrappedStateRt<State>().decode(previousState));

  const commonRuleFields = getCommonAlertFields(options);

  const currentAlerts: Record<string, ExplicitAlertFields> = {};

  const lifecycleAlertServices: LifecycleAlertServices<
    InstanceState,
    InstanceContext,
    ActionGroupIds
  > = {
    alertWithLifecycle: ({ id, fields }) => {
      currentAlerts[id] = fields;

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

  const trackedAlertStates = Object.values(state.trackedAlerts);

  logger.debug(
    `Tracking ${allAlertIds.length} alerts (${newAlertIds.length} new, ${trackedAlertStates.length} previous)`
  );

  const alertsDataMap: Record<string, Partial<ParsedTechnicalFields>> = {
    ...currentAlerts,
  };

  if (trackedAlertStates.length) {
    const { hits } = await ruleDataClient.getReader().search({
      body: {
        query: {
          bool: {
            filter: [
              {
                term: {
                  [ALERT_RULE_UUID]: commonRuleFields[ALERT_RULE_UUID],
                },
              },
              {
                terms: {
                  [ALERT_UUID]: trackedAlertStates.map(
                    (trackedAlertState) => trackedAlertState.alertUuid
                  ),
                },
              },
            ],
          },
        },
        size: trackedAlertStates.length,
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
      const alertId = fields[ALERT_INSTANCE_ID];
      alertsDataMap[alertId] = {
        ...commonRuleFields,
        ...fields,
      };
    });
  }

  const eventsToIndex = allAlertIds.map((alertId) => {
    const alertData = alertsDataMap[alertId];

    if (!alertData) {
      logger.warn(`Could not find alert data for ${alertId}`);
    }

    const isNew = !state.trackedAlerts[alertId];
    const isRecovered = !currentAlerts[alertId];
    const isActive = !isRecovered;

    const { alertUuid, started } = state.trackedAlerts[alertId] ?? {
      alertUuid: v4(),
      started: commonRuleFields[TIMESTAMP],
    };
    const event: ParsedTechnicalFields = {
      ...alertData,
      ...commonRuleFields,
      [ALERT_DURATION]: (options.startedAt.getTime() - new Date(started).getTime()) * 1000,
      [ALERT_INSTANCE_ID]: alertId,
      [ALERT_START]: started,
      [ALERT_STATUS]: isActive ? ALERT_STATUS_ACTIVE : ALERT_STATUS_RECOVERED,
      [ALERT_WORKFLOW_STATUS]: alertData[ALERT_WORKFLOW_STATUS] ?? 'open',
      [ALERT_UUID]: alertUuid,
      [EVENT_KIND]: 'signal',
      [EVENT_ACTION]: isNew ? 'open' : isActive ? 'active' : 'close',
      [VERSION]: ruleDataClient.kibanaVersion,
      ...(isRecovered ? { [ALERT_END]: commonRuleFields[TIMESTAMP] } : {}),
    };

    return event;
  });

  if (eventsToIndex.length > 0 && ruleDataClient.isWriteEnabled()) {
    logger.debug(`Preparing to index ${eventsToIndex.length} alerts.`);

    await ruleDataClient.getWriter().bulk({
      body: eventsToIndex.flatMap((event) => [{ index: { _id: event[ALERT_UUID]! } }, event]),
    });
  }

  const nextTrackedAlerts = Object.fromEntries(
    eventsToIndex
      .filter((event) => event[ALERT_STATUS] !== 'closed')
      .map((event) => {
        const alertId = event[ALERT_INSTANCE_ID]!;
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
