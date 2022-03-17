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
import { difference } from 'lodash';
import {
  AlertExecutorOptions,
  Alert,
  AlertInstanceContext,
  AlertInstanceState,
  AlertTypeParams,
  AlertTypeState,
} from '../../../alerting/server';
import { ParsedExperimentalFields } from '../../common/parse_experimental_fields';
import { ParsedTechnicalFields } from '../../common/parse_technical_fields';
import {
  ALERT_DURATION,
  ALERT_END,
  ALERT_INSTANCE_ID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
  EVENT_ACTION,
  EVENT_KIND,
  TAGS,
  TIMESTAMP,
  VERSION,
} from '../../common/technical_rule_data_field_names';
import { IRuleDataClient } from '../rule_data_client';
import { AlertExecutorOptionsWithExtraServices } from '../types';
import { fetchExistingAlerts } from './fetch_existing_alerts';
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
}) => Alert<InstanceState, InstanceContext, ActionGroupIds>;

export interface LifecycleAlertServices<
  InstanceState extends AlertInstanceState = never,
  InstanceContext extends AlertInstanceContext = never,
  ActionGroupIds extends string = never
> {
  alertWithLifecycle: LifecycleAlertService<InstanceState, InstanceContext, ActionGroupIds>;
  getAlertStartedDate: (alertId: string) => string | null;
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

export const createLifecycleExecutor =
  (logger: Logger, ruleDataClient: PublicContract<IRuleDataClient>) =>
  <
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
  ) =>
  async (
    options: AlertExecutorOptions<
      Params,
      WrappedLifecycleRuleState<State>,
      InstanceState,
      InstanceContext,
      ActionGroupIds
    >
  ): Promise<WrappedLifecycleRuleState<State>> => {
    const {
      services: { alertFactory, shouldWriteAlerts },
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
        return alertFactory.create(id);
      },
      getAlertStartedDate: (alertId: string) => state.trackedAlerts[alertId]?.started ?? null,
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
    const newAlertIds = difference(currentAlertIds, trackedAlertIds);
    const allAlertIds = [...new Set(currentAlertIds.concat(trackedAlertIds))];

    const trackedAlertStates = Object.values(state.trackedAlerts);

    logger.debug(
      `[Rule Registry] Tracking ${allAlertIds.length} alerts (${newAlertIds.length} new, ${trackedAlertStates.length} previous)`
    );

    const trackedAlertsDataMap: Record<
      string,
      { indexName: string; fields: Partial<ParsedTechnicalFields & ParsedExperimentalFields> }
    > = {};

    if (trackedAlertStates.length) {
      const result = await fetchExistingAlerts(
        ruleDataClient,
        trackedAlertStates,
        commonRuleFields
      );
      result.forEach((hit) => {
        const alertId = hit._source ? hit._source[ALERT_INSTANCE_ID] : void 0;
        if (alertId && hit._source) {
          trackedAlertsDataMap[alertId] = {
            indexName: hit._index,
            fields: hit._source,
          };
        }
      });
    }

    const makeEventsDataMapFor = (alertIds: string[]) =>
      alertIds.map((alertId) => {
        const alertData = trackedAlertsDataMap[alertId];
        const currentAlertData = currentAlerts[alertId];

        if (!alertData) {
          logger.debug(`[Rule Registry] Could not find alert data for ${alertId}`);
        }

        const isNew = !state.trackedAlerts[alertId];
        const isRecovered = !currentAlerts[alertId];
        const isActive = !isRecovered;

        const { alertUuid, started } = state.trackedAlerts[alertId] ?? {
          alertUuid: v4(),
          started: commonRuleFields[TIMESTAMP],
        };

        const event: ParsedTechnicalFields & ParsedExperimentalFields = {
          ...alertData?.fields,
          ...commonRuleFields,
          ...currentAlertData,
          [ALERT_DURATION]: (options.startedAt.getTime() - new Date(started).getTime()) * 1000,

          [ALERT_INSTANCE_ID]: alertId,
          [ALERT_START]: started,
          [ALERT_UUID]: alertUuid,
          [ALERT_STATUS]: isRecovered ? ALERT_STATUS_RECOVERED : ALERT_STATUS_ACTIVE,
          [ALERT_WORKFLOW_STATUS]: alertData?.fields[ALERT_WORKFLOW_STATUS] ?? 'open',
          [EVENT_KIND]: 'signal',
          [EVENT_ACTION]: isNew ? 'open' : isActive ? 'active' : 'close',
          [VERSION]: ruleDataClient.kibanaVersion,
          [TAGS]: options.tags,
          ...(isRecovered ? { [ALERT_END]: commonRuleFields[TIMESTAMP] } : {}),
        };

        return {
          indexName: alertData?.indexName,
          event,
        };
      });

    const trackedEventsToIndex = makeEventsDataMapFor(trackedAlertIds);
    const newEventsToIndex = makeEventsDataMapFor(newAlertIds);
    const allEventsToIndex = [...trackedEventsToIndex, ...newEventsToIndex];

    // Only write alerts if:
    // - writing is enabled
    //   AND
    //   - rule execution has not been cancelled due to timeout
    //     OR
    //   - if execution has been cancelled due to timeout, if feature flags are configured to write alerts anyway
    const writeAlerts = ruleDataClient.isWriteEnabled() && shouldWriteAlerts();

    if (allEventsToIndex.length > 0 && writeAlerts) {
      logger.debug(`[Rule Registry] Preparing to index ${allEventsToIndex.length} alerts.`);

      await ruleDataClient.getWriter().bulk({
        body: allEventsToIndex.flatMap(({ event, indexName }) => [
          indexName
            ? { index: { _id: event[ALERT_UUID]!, _index: indexName, require_alias: false } }
            : { index: { _id: event[ALERT_UUID]! } },
          event,
        ]),
      });
    }

    const nextTrackedAlerts = Object.fromEntries(
      allEventsToIndex
        .filter(({ event }) => event[ALERT_STATUS] !== ALERT_STATUS_RECOVERED)
        .map(({ event }) => {
          const alertId = event[ALERT_INSTANCE_ID]!;
          const alertUuid = event[ALERT_UUID]!;
          const started = new Date(event[ALERT_START]!).toISOString();
          return [alertId, { alertId, alertUuid, started }];
        })
    );

    return {
      wrapped: nextWrappedState ?? ({} as State),
      trackedAlerts: writeAlerts ? nextTrackedAlerts : {},
    };
  };
