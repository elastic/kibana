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

interface BuildOngoingAlertOpts<
  AlertData extends RuleAlertData,
  LegacyState extends AlertInstanceState,
  LegacyContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  alert: Alert & AlertData;
  legacyAlert: LegacyAlert<LegacyState, LegacyContext, ActionGroupIds | RecoveryActionGroupId>;
  rule: AlertRule;
  payload?: DeepPartial<AlertData>;
  timestamp: string;
  kibanaVersion: string;
}

/**
 * Updates an existing alert document with data from the LegacyAlert class
 * Currently only populates framework fields and not any rule type specific fields
 */

export const buildOngoingAlert = <
  AlertData extends RuleAlertData,
  LegacyState extends AlertInstanceState,
  LegacyContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>({
  alert,
  legacyAlert,
  payload,
  rule,
  timestamp,
  kibanaVersion,
}: BuildOngoingAlertOpts<
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
          action: 'active',
        },
        kibana: {
          alert: {
            // Because we're building this alert after the action execution handler has been
            // run, the scheduledExecutionOptions for the alert has been cleared and
            // the lastScheduledActions has been set. If we ever change the order of operations
            // to build and persist the alert before action execution handler, we will need to
            // update where we pull the action group from.
            // Set latest action group as this may have changed during execution (ex: error -> warning)
            action_group: legacyAlert.getScheduledActionOptions()?.actionGroup,
            // Set latest flapping state
            flapping: legacyAlert.getFlapping(),
            // Set latest flapping_history
            flapping_history: legacyAlert.getFlappingHistory(),
            // Set latest maintenance window IDs
            maintenance_window_ids: legacyAlert.getMaintenanceWindowIds(),
            // Set latest rule configuration
            rule: rule.kibana?.alert.rule,
            // Set latest duration as ongoing alerts should have updated duration
            ...(legacyAlert.getState().duration
              ? { duration: { us: legacyAlert.getState().duration } }
              : {}),
            // Fields that are explicitly not updated:
            // event.kind
            // instance.id
            // status - ongoing alerts should maintain 'active' status
            // uuid - ongoing alerts should carry over previous UUID
            // start - ongoing alerts should keep the initial start time
            // time_range - ongoing alerts should keep the initial time_range
            // workflow_status - ongoing alerts should keep the initial workflow status
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
