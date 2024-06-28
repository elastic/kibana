/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import deepmerge from 'deepmerge';
import type { Alert } from '@kbn/alerts-as-data-utils';
import {
  ALERT_RULE_TAGS,
  SPACE_IDS,
  ALERT_ACTION_GROUP,
  ALERT_DURATION,
  ALERT_FLAPPING,
  ALERT_FLAPPING_HISTORY,
  ALERT_MAINTENANCE_WINDOW_IDS,
  ALERT_STATUS,
  EVENT_ACTION,
  TAGS,
  TIMESTAMP,
  VERSION,
  ALERT_END,
  ALERT_TIME_RANGE,
  ALERT_START,
  ALERT_CONSECUTIVE_MATCHES,
  ALERT_RULE_EXECUTION_TIMESTAMP,
  ALERT_PREVIOUS_ACTION_GROUP,
  ALERT_SEVERITY_IMPROVING,
} from '@kbn/rule-data-utils';
import { DeepPartial } from '@kbn/utility-types';
import { get } from 'lodash';
import { Alert as LegacyAlert } from '../../alert/alert';
import { AlertInstanceContext, AlertInstanceState, RuleAlertData } from '../../types';
import type { AlertRule } from '../types';
import { stripFrameworkFields } from './strip_framework_fields';
import { nanosToMicros } from './nanos_to_micros';
import { removeUnflattenedFieldsFromAlert, replaceRefreshableAlertFields } from './format_alert';

interface BuildRecoveredAlertOpts<
  AlertData extends RuleAlertData,
  LegacyState extends AlertInstanceState,
  LegacyContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  alert: Alert & AlertData;
  legacyAlert: LegacyAlert<LegacyState, LegacyContext, ActionGroupIds | RecoveryActionGroupId>;
  rule: AlertRule;
  runTimestamp?: string;
  recoveryActionGroup: string;
  payload?: DeepPartial<AlertData>;
  timestamp: string;
  kibanaVersion: string;
}

/**
 * Updates an active alert document to recovered
 * Currently only populates framework fields and not any rule type specific fields
 */

export const buildRecoveredAlert = <
  AlertData extends RuleAlertData,
  LegacyState extends AlertInstanceState,
  LegacyContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>({
  alert,
  legacyAlert,
  rule,
  timestamp,
  payload,
  runTimestamp,
  recoveryActionGroup,
  kibanaVersion,
}: BuildRecoveredAlertOpts<
  AlertData,
  LegacyState,
  LegacyContext,
  ActionGroupIds,
  RecoveryActionGroupId
>): Alert & AlertData => {
  const cleanedPayload = stripFrameworkFields(payload);

  // Make sure that any alert fields that are updateable are flattened.
  const refreshableAlertFields = replaceRefreshableAlertFields(alert);

  const alertUpdates = {
    // Set latest rule configuration
    ...rule,
    // Update the timestamp to reflect latest update time
    [TIMESTAMP]: timestamp,
    [EVENT_ACTION]: 'close',
    [ALERT_RULE_EXECUTION_TIMESTAMP]: runTimestamp ?? timestamp,
    // Set the recovery action group
    [ALERT_ACTION_GROUP]: recoveryActionGroup,
    // Set latest flapping state
    [ALERT_FLAPPING]: legacyAlert.getFlapping(),
    // Set latest flapping_history
    [ALERT_FLAPPING_HISTORY]: legacyAlert.getFlappingHistory(),
    // Alert is recovering from active state so by default it is improving
    [ALERT_SEVERITY_IMPROVING]: true,
    [ALERT_PREVIOUS_ACTION_GROUP]: get(alert, ALERT_ACTION_GROUP),
    // Set latest maintenance window IDs
    [ALERT_MAINTENANCE_WINDOW_IDS]: legacyAlert.getMaintenanceWindowIds(),
    // Set latest match count, should be 0
    [ALERT_CONSECUTIVE_MATCHES]: legacyAlert.getActiveCount(),
    // Set status to 'recovered'
    [ALERT_STATUS]: 'recovered',
    // Set latest duration as recovered alerts should have updated duration
    ...(legacyAlert.getState().duration
      ? { [ALERT_DURATION]: nanosToMicros(legacyAlert.getState().duration) }
      : {}),
    // Set end time
    ...(legacyAlert.getState().end && legacyAlert.getState().start
      ? {
          [ALERT_START]: legacyAlert.getState().start,
          [ALERT_END]: legacyAlert.getState().end,
          [ALERT_TIME_RANGE]: {
            gte: legacyAlert.getState().start,
            lte: legacyAlert.getState().end,
          },
        }
      : {}),

    [SPACE_IDS]: rule[SPACE_IDS],
    // Set latest kibana version
    [VERSION]: kibanaVersion,
    [TAGS]: Array.from(
      new Set([
        ...((cleanedPayload?.tags as string[]) ?? []),
        ...(alert.tags ?? []),
        ...(rule[ALERT_RULE_TAGS] ?? []),
      ])
    ),
  };

  // Clean the existing alert document so any nested fields that will be updated
  // are removed, to avoid duplicate data.
  // e.g. if the existing alert document has the field:
  // {
  //   kibana: {
  //     alert: {
  //       field1: 'value1'
  //     }
  //   }
  // }
  // and the updated alert has the field
  // {
  //   'kibana.alert.field1': 'value2'
  // }
  // the expanded field from the existing alert is removed
  const cleanedAlert = removeUnflattenedFieldsFromAlert(alert, {
    ...cleanedPayload,
    ...alertUpdates,
    ...refreshableAlertFields,
  });

  return deepmerge.all([cleanedAlert, refreshableAlertFields, cleanedPayload, alertUpdates], {
    arrayMerge: (_, sourceArray) => sourceArray,
  }) as Alert & AlertData;
};
