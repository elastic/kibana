/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import deepmerge from 'deepmerge';
import { get } from 'lodash';
import type { Alert } from '@kbn/alerts-as-data-utils';
import {
  ALERT_ACTION_GROUP,
  ALERT_DURATION,
  ALERT_FLAPPING,
  ALERT_FLAPPING_HISTORY,
  ALERT_INSTANCE_ID,
  ALERT_MAINTENANCE_WINDOW_IDS,
  ALERT_CONSECUTIVE_MATCHES,
  ALERT_RULE_TAGS,
  ALERT_START,
  ALERT_STATUS,
  ALERT_TIME_RANGE,
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
  EVENT_ACTION,
  EVENT_KIND,
  SPACE_IDS,
  TAGS,
  TIMESTAMP,
  VERSION,
} from '@kbn/rule-data-utils';
import { DeepPartial } from '@kbn/utility-types';
import { Alert as LegacyAlert } from '../../alert/alert';
import { AlertInstanceContext, AlertInstanceState, RuleAlertData } from '../../types';
import type { AlertRule } from '../types';
import { stripFrameworkFields } from './strip_framework_fields';
import { nanosToMicros } from './nanos_to_micros';

interface BuildNewAlertOpts<
  AlertData extends RuleAlertData,
  LegacyState extends AlertInstanceState,
  LegacyContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  legacyAlert: LegacyAlert<LegacyState, LegacyContext, ActionGroupIds | RecoveryActionGroupId>;
  rule: AlertRule;
  payload?: DeepPartial<AlertData>;
  timestamp: string;
  kibanaVersion: string;
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
  kibanaVersion,
}: BuildNewAlertOpts<
  AlertData,
  LegacyState,
  LegacyContext,
  ActionGroupIds,
  RecoveryActionGroupId
>): Alert & AlertData => {
  const cleanedPayload = stripFrameworkFields(payload);
  return deepmerge.all(
    [
      cleanedPayload,
      rule,
      {
        [TIMESTAMP]: timestamp,
        [EVENT_ACTION]: 'open',
        [EVENT_KIND]: 'signal',
        [ALERT_ACTION_GROUP]: legacyAlert.getScheduledActionOptions()?.actionGroup,
        [ALERT_FLAPPING]: legacyAlert.getFlapping(),
        [ALERT_FLAPPING_HISTORY]: legacyAlert.getFlappingHistory(),
        [ALERT_INSTANCE_ID]: legacyAlert.getId(),
        [ALERT_MAINTENANCE_WINDOW_IDS]: legacyAlert.getMaintenanceWindowIds(),
        [ALERT_CONSECUTIVE_MATCHES]: legacyAlert.getActiveCount(),
        [ALERT_STATUS]: 'active',
        [ALERT_UUID]: legacyAlert.getUuid(),
        [ALERT_WORKFLOW_STATUS]: get(cleanedPayload, ALERT_WORKFLOW_STATUS, 'open'),
        ...(legacyAlert.getState().duration
          ? { [ALERT_DURATION]: nanosToMicros(legacyAlert.getState().duration) }
          : {}),
        ...(legacyAlert.getState().start
          ? {
              [ALERT_START]: legacyAlert.getState().start,
              [ALERT_TIME_RANGE]: { gte: legacyAlert.getState().start },
            }
          : {}),
        [SPACE_IDS]: rule[SPACE_IDS],
        [VERSION]: kibanaVersion,
        [TAGS]: Array.from(
          new Set([...((cleanedPayload?.tags as string[]) ?? []), ...(rule[ALERT_RULE_TAGS] ?? [])])
        ),
      },
    ],
    { arrayMerge: (_, sourceArray) => sourceArray }
  ) as Alert & AlertData;
};
