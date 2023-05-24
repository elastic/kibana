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
  timestamp: string;
}

/**
 * Updates an existing alert document with data from the LegacyAlert class
 * This could be a currently active alert that is now recovered or a previously
 * recovered alert that has updates to its flapping history
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
  recoveryActionGroup,
}: BuildRecoveredAlertOpts<
  AlertData,
  LegacyState,
  LegacyContext,
  ActionGroupIds,
  RecoveryActionGroupId
>): Alert & AlertData => {
  // If we're updating an active alert to be recovered,
  // persist any maintenance window IDs on the alert, otherwise
  // we should only be changing fields related to flapping
  let maintenanceWindowIds = alert.kibana.alert.status === 'active' ? legacyAlert.getMaintenanceWindowIds() : null;
  return {
    ...alert,
    // Update the timestamp to reflect latest update time
    '@timestamp': timestamp,
    kibana: {
      ...alert.kibana,
      alert: {
        ...alert.kibana.alert,
        // Set the recovery action group
        action_group: recoveryActionGroup,
        // Set latest flapping state
        flapping: legacyAlert.getFlapping(),
        // Set latest rule configuration
        rule: rule.kibana?.alert.rule,
        // Set status to 'recovered'
        status: 'recovered',
        // Set latest duration as recovered alerts should have updated duration
        ...(legacyAlert.getState().duration
          ? { duration: { us: legacyAlert.getState().duration } }
          : {}),
        // Set end time
        ...(legacyAlert.getState().end ? { end: legacyAlert.getState().end } : {}),
        // Set latest flapping history
        ...(!isEmpty(legacyAlert.getFlappingHistory())
          ? { flapping_history: legacyAlert.getFlappingHistory() }
          : {}),
        // Set maintenance window IDs if defined
        ...(maintenanceWindowIds
          ? { maintenance_window_ids: maintenanceWindowIds }
          : {}),

        // Fields that are explicitly not updated:
        // instance.id
        // action_group
        // uuid - recovered alerts should carry over previous UUID
        // start - recovered alerts should keep the initial start time
      },
      space_ids: rule.kibana?.space_ids,
    },
  };
};
