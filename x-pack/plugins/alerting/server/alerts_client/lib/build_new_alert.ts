/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import deepmerge from 'deepmerge';
import type { Alert } from '@kbn/alerts-as-data-utils';
import { Alert as LegacyAlert } from '../../alert/alert';
import { AlertInstanceContext, AlertInstanceState, RuleAlertData } from '../../types';
import type { AlertRule } from '../types';
import { stripFrameworkFields } from './strip_framework_fields';

interface BuildNewAlertOpts<
  AlertData extends RuleAlertData,
  LegacyState extends AlertInstanceState,
  LegacyContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  legacyAlert: LegacyAlert<LegacyState, LegacyContext, ActionGroupIds | RecoveryActionGroupId>;
  rule: AlertRule;
  payload?: AlertData;
  timestamp: string;
}

/**
 * Builds a new alert document from the LegacyAlert class
 * Currently only populates framework fields and not any rule type specific fields
 */

export const buildNewAlert = <
  AlertData extends RuleAlertData,
  LegacyState extends AlertInstanceState,
  LegacyContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>({
  legacyAlert,
  rule,
  timestamp,
  payload,
}: BuildNewAlertOpts<
  AlertData,
  LegacyState,
  LegacyContext,
  ActionGroupIds,
  RecoveryActionGroupId
>): Alert & AlertData => {
  const cleanedPayload = payload ? stripFrameworkFields(payload) : {};
  return deepmerge.all(
    [
      cleanedPayload,
      {
        '@timestamp': timestamp,
        kibana: {
          alert: {
            action_group: legacyAlert.getScheduledActionOptions()?.actionGroup,
            flapping: legacyAlert.getFlapping(),
            flapping_history: legacyAlert.getFlappingHistory(),
            instance: {
              id: legacyAlert.getId(),
            },
            maintenance_window_ids: legacyAlert.getMaintenanceWindowIds(),
            rule: rule.kibana?.alert.rule,
            status: 'active',
            uuid: legacyAlert.getUuid(),
            ...(legacyAlert.getState().duration
              ? { duration: { us: legacyAlert.getState().duration } }
              : {}),
            ...(legacyAlert.getState().start ? { start: legacyAlert.getState().start } : {}),
          },
          space_ids: rule.kibana?.space_ids,
        },
      },
    ],
    { arrayMerge: (_, sourceArray) => sourceArray }
  ) as Alert & AlertData;
};
