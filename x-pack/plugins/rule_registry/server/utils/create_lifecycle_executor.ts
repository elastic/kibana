/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { PublicContract } from '@kbn/utility-types';
import { getOrElse } from 'fp-ts/lib/Either';
import { v4 } from 'uuid';
import { difference } from 'lodash';
import {
  RuleExecutorOptions,
  Alert,
  AlertInstanceContext,
  AlertInstanceState,
  RuleTypeParams,
  RuleTypeState,
  isValidAlertIndexName,
} from '@kbn/alerting-plugin/server';
import { isFlapping } from '@kbn/alerting-plugin/server/lib';
import { wrappedStateRt, WrappedLifecycleRuleState } from '@kbn/alerting-state-types';
export type {
  TrackedLifecycleAlertState,
  WrappedLifecycleRuleState,
} from '@kbn/alerting-state-types';
import { ParsedExperimentalFields } from '../../common/parse_experimental_fields';
import { ParsedTechnicalFields } from '../../common/parse_technical_fields';
import {
  ALERT_TIME_RANGE,
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
  ALERT_FLAPPING,
  ALERT_MAINTENANCE_WINDOW_IDS,
} from '../../common/technical_rule_data_field_names';
import { CommonAlertFieldNameLatest, CommonAlertIdFieldNameLatest } from '../../common/schemas';
import { IRuleDataClient } from '../rule_data_client';
import { AlertExecutorOptionsWithExtraServices } from '../types';
import { fetchExistingAlerts } from './fetch_existing_alerts';
import { getCommonAlertFields } from './get_common_alert_fields';
import { getUpdatedFlappingHistory } from './get_updated_flapping_history';
import { fetchAlertByAlertUUID } from './fetch_alert_by_uuid';
import { getAlertsForNotification } from './get_alerts_for_notification';

type ImplicitTechnicalFieldName = CommonAlertFieldNameLatest | CommonAlertIdFieldNameLatest;

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
  getAlertStartedDate: (alertInstanceId: string) => string | null;
  getAlertUuid: (alertInstanceId: string) => string;
  getAlertByAlertUuid: (
    alertUuid: string
  ) => Promise<Partial<ParsedTechnicalFields & ParsedExperimentalFields> | null> | null;
}

export type LifecycleRuleExecutor<
  Params extends RuleTypeParams = never,
  State extends RuleTypeState = never,
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
) => Promise<{ state: State }>;

export const createLifecycleExecutor =
  (logger: Logger, ruleDataClient: PublicContract<IRuleDataClient>) =>
  <
    Params extends RuleTypeParams = never,
    State extends RuleTypeState = never,
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
    options: RuleExecutorOptions<
      Params,
      WrappedLifecycleRuleState<State>,
      InstanceState,
      InstanceContext,
      ActionGroupIds
    >
  ): Promise<{ state: WrappedLifecycleRuleState<State> }> => {
    const {
      services: { alertFactory, shouldWriteAlerts },
      state: previousState,
      flappingSettings,
      maintenanceWindowIds,
      rule,
    } = options;

    const ruleDataClientWriter = await ruleDataClient.getWriter();

    const state = getOrElse(
      (): WrappedLifecycleRuleState<State> => ({
        wrapped: previousState as State,
        trackedAlerts: {},
        trackedAlertsRecovered: {},
      })
    )(wrappedStateRt<State>().decode(previousState));

    const commonRuleFields = getCommonAlertFields(options);

    const currentAlerts: Record<string, ExplicitAlertFields> = {};
    const alertUuidMap: Map<string, string> = new Map();

    const lifecycleAlertServices: LifecycleAlertServices<
      InstanceState,
      InstanceContext,
      ActionGroupIds
    > = {
      alertWithLifecycle: ({ id, fields }) => {
        currentAlerts[id] = fields;
        const alert = alertFactory.create(id);
        const uuid = alert.getUuid();
        alertUuidMap.set(id, uuid);
        return alert;
      },
      getAlertStartedDate: (alertId: string) => state.trackedAlerts[alertId]?.started ?? null,
      getAlertUuid: (alertId: string) => {
        const uuid = alertUuidMap.get(alertId);
        if (uuid) {
          return uuid;
        }

        const trackedAlert = state.trackedAlerts[alertId];
        if (trackedAlert) {
          return trackedAlert.alertUuid;
        }

        const trackedRecoveredAlert = state.trackedAlertsRecovered[alertId];
        if (trackedRecoveredAlert) {
          return trackedRecoveredAlert.alertUuid;
        }

        const alertInfo = `alert ${alertId} of rule ${rule.ruleTypeId}:${rule.id}`;
        logger.warn(
          `[Rule Registry] requesting uuid for ${alertInfo} which is not tracked, generating dynamically`
        );
        return v4();
      },
      getAlertByAlertUuid: async (alertUuid: string) => {
        try {
          return await fetchAlertByAlertUUID(ruleDataClient, alertUuid);
        } catch (err) {
          return null;
        }
      },
    };

    const wrappedExecutorResult = await wrappedExecutor({
      ...options,
      state: state.wrapped != null ? state.wrapped : ({} as State),
      services: {
        ...options.services,
        ...lifecycleAlertServices,
      },
    });

    const currentAlertIds = Object.keys(currentAlerts);
    const trackedAlertIds = Object.keys(state.trackedAlerts);
    const trackedAlertRecoveredIds = Object.keys(state.trackedAlertsRecovered);
    const newAlertIds = difference(currentAlertIds, trackedAlertIds);
    const allAlertIds = [...new Set(currentAlertIds.concat(trackedAlertIds))];

    const trackedAlertStates = Object.values(state.trackedAlerts);

    logger.debug(
      `[Rule Registry] Tracking ${allAlertIds.length} alerts (${newAlertIds.length} new, ${trackedAlertStates.length} previous)`
    );

    interface TrackedAlertData {
      indexName: string;
      fields: Partial<ParsedTechnicalFields & ParsedExperimentalFields>;
      seqNo: number | undefined;
      primaryTerm: number | undefined;
    }

    const trackedAlertsDataMap: Record<string, TrackedAlertData> = {};

    if (trackedAlertStates.length) {
      const result = await fetchExistingAlerts(
        ruleDataClient,
        trackedAlertStates,
        commonRuleFields
      );
      result.forEach((hit) => {
        const alertInstanceId = hit._source ? hit._source[ALERT_INSTANCE_ID] : void 0;
        if (alertInstanceId && hit._source) {
          const alertLabel = `${rule.ruleTypeId}:${rule.id} ${alertInstanceId}`;
          if (hit._seq_no == null) {
            logger.error(`missing _seq_no on alert instance ${alertLabel}`);
          } else if (hit._primary_term == null) {
            logger.error(`missing _primary_term on alert instance ${alertLabel}`);
          } else {
            trackedAlertsDataMap[alertInstanceId] = {
              indexName: hit._index,
              fields: hit._source,
              seqNo: hit._seq_no,
              primaryTerm: hit._primary_term,
            };
          }
        }
      });
    }

    const makeEventsDataMapFor = (alertIds: string[]) =>
      alertIds
        .filter((alertId) => {
          const alertData = trackedAlertsDataMap[alertId];
          const alertIndex = alertData?.indexName;
          if (!alertIndex) {
            return true;
          } else if (!isValidAlertIndexName(alertIndex)) {
            logger.warn(
              `Could not update alert ${alertId} in ${alertIndex}. Partial and restored alert indices are not supported.`
            );
            return false;
          }
          return true;
        })
        .map((alertId) => {
          const alertData = trackedAlertsDataMap[alertId];
          const currentAlertData = currentAlerts[alertId];
          const trackedAlert = state.trackedAlerts[alertId];

          if (!alertData) {
            logger.debug(`[Rule Registry] Could not find alert data for ${alertId}`);
          }

          const isNew = !trackedAlert;
          const isRecovered = !currentAlertData;
          const isActive = !isRecovered;

          const flappingHistory = getUpdatedFlappingHistory<State>(
            flappingSettings,
            alertId,
            state,
            isNew,
            isRecovered,
            isActive,
            trackedAlertRecoveredIds
          );

          const { alertUuid, started, flapping, pendingRecoveredCount, activeCount } = !isNew
            ? state.trackedAlerts[alertId]
            : {
                alertUuid: lifecycleAlertServices.getAlertUuid(alertId),
                started: commonRuleFields[TIMESTAMP],
                flapping: state.trackedAlertsRecovered[alertId]
                  ? state.trackedAlertsRecovered[alertId].flapping
                  : false,
                pendingRecoveredCount: 0,
                activeCount: 0,
              };

          const event: ParsedTechnicalFields & ParsedExperimentalFields = {
            ...alertData?.fields,
            ...commonRuleFields,
            ...currentAlertData,
            [ALERT_DURATION]: (options.startedAt.getTime() - new Date(started).getTime()) * 1000,
            [ALERT_TIME_RANGE]: isRecovered
              ? {
                  gte: started,
                  lte: commonRuleFields[TIMESTAMP],
                }
              : { gte: started },
            [ALERT_INSTANCE_ID]: alertId,
            [ALERT_START]: started,
            [ALERT_UUID]: alertUuid,
            [ALERT_STATUS]: isRecovered ? ALERT_STATUS_RECOVERED : ALERT_STATUS_ACTIVE,
            [ALERT_WORKFLOW_STATUS]: alertData?.fields[ALERT_WORKFLOW_STATUS] ?? 'open',
            [EVENT_KIND]: 'signal',
            [EVENT_ACTION]: isNew ? 'open' : isActive ? 'active' : 'close',
            [TAGS]: Array.from(
              new Set([
                ...(currentAlertData?.tags ?? []),
                ...(alertData?.fields[TAGS] ?? []),
                ...(options.rule.tags ?? []),
              ])
            ),
            [VERSION]: ruleDataClient.kibanaVersion,
            [ALERT_FLAPPING]: flapping,
            ...(isRecovered ? { [ALERT_END]: commonRuleFields[TIMESTAMP] } : {}),
            ...(isNew && maintenanceWindowIds?.length
              ? { [ALERT_MAINTENANCE_WINDOW_IDS]: maintenanceWindowIds }
              : {}),
          };

          return {
            indexName: alertData?.indexName,
            seqNo: alertData?.seqNo,
            primaryTerm: alertData?.primaryTerm,
            event,
            flappingHistory,
            flapping,
            pendingRecoveredCount,
            activeCount,
          };
        });

    const trackedEventsToIndex = makeEventsDataMapFor(trackedAlertIds);
    const newEventsToIndex = makeEventsDataMapFor(newAlertIds);
    const trackedRecoveredEventsToIndex = makeEventsDataMapFor(trackedAlertRecoveredIds);
    const allEventsToIndex = getAlertsForNotification(
      flappingSettings,
      rule.alertDelay?.active ?? 0,
      trackedEventsToIndex,
      newEventsToIndex,
      { maintenanceWindowIds, timestamp: commonRuleFields[TIMESTAMP] }
    );

    // Only write alerts if:
    // - writing is enabled
    //   AND
    //   - rule execution has not been cancelled due to timeout
    //     OR
    //   - if execution has been cancelled due to timeout, if feature flags are configured to write alerts anyway
    const writeAlerts = ruleDataClient.isWriteEnabled() && shouldWriteAlerts();

    if (allEventsToIndex.length > 0 && writeAlerts) {
      logger.debug(`[Rule Registry] Preparing to index ${allEventsToIndex.length} alerts.`);

      await ruleDataClientWriter.bulk({
        body: allEventsToIndex.flatMap(({ event, indexName, seqNo, primaryTerm }) => [
          indexName
            ? {
                index: {
                  _id: event[ALERT_UUID]!,
                  _index: indexName,
                  if_seq_no: seqNo,
                  if_primary_term: primaryTerm,
                  require_alias: false,
                },
              }
            : {
                create: {
                  _id: event[ALERT_UUID]!,
                },
              },
          event,
        ]),
        refresh: true,
      });
    } else {
      logger.debug(
        `[Rule Registry] Not indexing ${allEventsToIndex.length} alerts because writing has been disabled.`
      );
    }

    const nextTrackedAlerts = Object.fromEntries(
      [...newEventsToIndex, ...trackedEventsToIndex]
        .filter(({ event }) => event[ALERT_STATUS] !== ALERT_STATUS_RECOVERED)
        .map(
          ({
            event,
            flappingHistory,
            flapping: isCurrentlyFlapping,
            pendingRecoveredCount,
            activeCount,
          }) => {
            const alertId = event[ALERT_INSTANCE_ID]!;
            const alertUuid = event[ALERT_UUID]!;
            const started = new Date(event[ALERT_START]!).toISOString();
            const flapping = isFlapping(flappingSettings, flappingHistory, isCurrentlyFlapping);
            return [
              alertId,
              {
                alertId,
                alertUuid,
                started,
                flappingHistory,
                flapping,
                pendingRecoveredCount,
                activeCount,
              },
            ];
          }
        )
    );

    const nextTrackedAlertsRecovered = Object.fromEntries(
      [...allEventsToIndex, ...trackedRecoveredEventsToIndex]
        .filter(
          ({ event, flappingHistory, flapping }) =>
            // return recovered alerts if they are flapping or if the flapping array is not at capacity
            // this is a space saving effort that will stop tracking a recovered alert if it wasn't flapping and doesn't have state changes
            // in the last max capcity number of executions
            event[ALERT_STATUS] === ALERT_STATUS_RECOVERED &&
            (flapping || flappingHistory.filter((f: boolean) => f).length > 0)
        )
        .map(
          ({
            event,
            flappingHistory,
            flapping: isCurrentlyFlapping,
            pendingRecoveredCount,
            activeCount,
          }) => {
            const alertId = event[ALERT_INSTANCE_ID]!;
            const alertUuid = event[ALERT_UUID]!;
            const started = new Date(event[ALERT_START]!).toISOString();
            const flapping = isFlapping(flappingSettings, flappingHistory, isCurrentlyFlapping);
            return [
              alertId,
              {
                alertId,
                alertUuid,
                started,
                flappingHistory,
                flapping,
                pendingRecoveredCount,
                activeCount,
              },
            ];
          }
        )
    );

    return {
      state: {
        wrapped: wrappedExecutorResult?.state ?? ({} as State),
        trackedAlerts: writeAlerts ? nextTrackedAlerts : {},
        trackedAlertsRecovered: writeAlerts ? nextTrackedAlertsRecovered : {},
      },
    };
  };
