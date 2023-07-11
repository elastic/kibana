/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import deepmerge from 'deepmerge';
import type { Alert } from '@kbn/alerts-as-data-utils';
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
        // Update the timestamp to reflect latest update time
        '@timestamp': timestamp,
        event: {
          action: 'close',
        },
        kibana: {
          alert: {
            // Set the recovery action group
            action_group: recoveryActionGroup,
            // Set latest flapping state
            flapping: legacyAlert.getFlapping(),
            // Set latest flapping_history
            flapping_history: legacyAlert.getFlappingHistory(),
            // Set latest maintenance window IDs
            maintenance_window_ids: legacyAlert.getMaintenanceWindowIds(),
            // Set latest rule configuration
            rule: rule.kibana?.alert.rule,
            // Set status to 'recovered'
            status: 'recovered',
            // Set latest duration as recovered alerts should have updated duration
            ...(legacyAlert.getState().duration
              ? { duration: { us: legacyAlert.getState().duration } }
              : {}),
            // Set end time
            ...(legacyAlert.getState().end
              ? {
                  end: legacyAlert.getState().end,
                  time_range: {
                    // this should get merged with a time_range.gte
                    lte: legacyAlert.getState().end,
                  },
                }
              : {}),

            // Fields that are explicitly not updated:
            // instance.id
            // action_group
            // uuid - recovered alerts should carry over previous UUID
            // start - recovered alerts should keep the initial start time
            // workflow_status - recovered alerts should keep the initial workflow_status
          },
          space_ids: rule.kibana?.space_ids,
          // Set latest kibana version
          version: kibanaVersion,
        },
        tags: Array.from(
          new Set([
            ...((cleanedPayload?.tags as string[]) ?? []),
            ...(alert.tags ?? []),
            ...(rule.kibana?.alert.rule.tags ?? []),
          ])
        ),
      },
    ],
    { arrayMerge: (_, sourceArray) => sourceArray }
  ) as Alert & AlertData;
};
