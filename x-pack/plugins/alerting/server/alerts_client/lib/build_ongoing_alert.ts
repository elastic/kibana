/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import type { Alert } from '@kbn/alerts-as-data-utils';
import { Alert as LegacyAlert } from '../../alert/alert';
import { AlertInstanceContext, AlertInstanceState, RuleAlertData } from '../../types';
import type { AlertRule } from '../types';

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
  timestamp: string;
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
  rule,
  timestamp,
}: BuildOngoingAlertOpts<
  AlertData,
  LegacyState,
  LegacyContext,
  ActionGroupIds,
  RecoveryActionGroupId
>): Alert & AlertData => {
  return {
    ...alert,
    // Update the timestamp to reflect latest update time
    '@timestamp': timestamp,
    kibana: {
      ...alert.kibana,
      alert: {
        ...alert.kibana.alert,
        // Set latest action group as this may have changed during execution (ex: error -> warning)
        action_group: legacyAlert.getScheduledActionOptions()?.actionGroup,
        // Set latest flapping state
        flapping: legacyAlert.getFlapping(),
        // Set latest rule configuration
        rule: rule.kibana?.alert.rule,
        // Set latest maintenance window IDs
        maintenance_window_ids: legacyAlert.getMaintenanceWindowIds(),
        // Set latest duration as ongoing alerts should have updated duration
        ...(legacyAlert.getState().duration
          ? { duration: { us: legacyAlert.getState().duration } }
          : {}),
        // Set latest flapping history
        ...(!isEmpty(legacyAlert.getFlappingHistory())
          ? { flapping_history: legacyAlert.getFlappingHistory() }
          : {}),

        // Fields that are explicitly not updated:
        // instance.id
        // status - ongoing alerts should maintain 'active' status
        // uuid - ongoing alerts should carry over previous UUID
        // start - ongoing alerts should keep the initial start time
      },
      space_ids: rule.kibana?.space_ids,
    },
  };
};
