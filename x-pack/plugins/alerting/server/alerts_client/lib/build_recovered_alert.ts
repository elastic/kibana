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
} from '@kbn/rule-data-utils';
import { DeepPartial } from '@kbn/utility-types';
import { Alert as LegacyAlert } from '../../alert/alert';
import { AlertInstanceContext, AlertInstanceState, RuleAlertData } from '../../types';
import type { AlertRule } from '../types';
import { stripFrameworkFields } from './strip_framework_fields';

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
  return deepmerge.all(
    [
      alert,
      cleanedPayload,
      {
        // Set latest rule configuration
        ...rule,
        // Update the timestamp to reflect latest update time
        [TIMESTAMP]: timestamp,
        [EVENT_ACTION]: 'close',
        // Set the recovery action group
        [ALERT_ACTION_GROUP]: recoveryActionGroup,
        // Set latest flapping state
        [ALERT_FLAPPING]: legacyAlert.getFlapping(),
        // Set latest flapping_history
        [ALERT_FLAPPING_HISTORY]: legacyAlert.getFlappingHistory(),
        // Set latest maintenance window IDs
        [ALERT_MAINTENANCE_WINDOW_IDS]: legacyAlert.getMaintenanceWindowIds(),
        // Set status to 'recovered'
        [ALERT_STATUS]: 'recovered',
        // Set latest duration as recovered alerts should have updated duration
        ...(legacyAlert.getState().duration
          ? { [ALERT_DURATION]: legacyAlert.getState().duration }
          : {}),
        // Set end time
        ...(legacyAlert.getState().end
          ? {
              [ALERT_END]: legacyAlert.getState().end,
              // this should get merged with a ALERT_TIME_RANGE_GTE
              [ALERT_TIME_RANGE]: { lte: legacyAlert.getState().end },
            }
          : {}),
        // Fields that are explicitly not updated:
        // instance.id
        // action_group
        // uuid - recovered alerts should carry over previous UUID
        // start - recovered alerts should keep the initial start time
        // workflow_status - recovered alerts should keep the initial workflow_status
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
      },
    ],
    { arrayMerge: (_, sourceArray) => sourceArray }
  ) as Alert & AlertData;
};
