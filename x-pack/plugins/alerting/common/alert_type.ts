/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LicenseType } from '../../licensing/common/types';
import { RecoveredActionGroupId, DefaultActionGroupId } from './builtin_action_groups';

export interface AlertType<
  ActionGroupIds extends Exclude<string, RecoveredActionGroupId> = DefaultActionGroupId,
  RecoveryActionGroupId extends string = RecoveredActionGroupId
> {
  id: string;
  name: string;
  actionGroups: Array<ActionGroup<ActionGroupIds>>;
  recoveryActionGroup: ActionGroup<RecoveryActionGroupId>;
  actionVariables: string[];
  defaultActionGroupId: ActionGroupIds;
  producer: string;
  minimumLicenseRequired: LicenseType;
  isExportable: boolean;
  ruleTaskTimeout?: string;
  defaultScheduleInterval?: string;
  minimumScheduleInterval?: string;
}

export interface RuleType<
  ActionGroupIds extends Exclude<string, RecoveredActionGroupId> = DefaultActionGroupId,
  RecoveryActionGroupId extends string = RecoveredActionGroupId
> {
  id: string;
  name: string;
  action_groups: Array<ActionGroup<ActionGroupIds>>;
  recovery_action_group: ActionGroup<RecoveryActionGroupId>;
  action_variables: string[];
  default_action_group_id: ActionGroupIds;
  producer: string;
  minimum_license_required: LicenseType;
  is_exportable: boolean;
  rule_task_timeout?: string;
  default_schedule_interval?: string;
  minimum_schedule_interval?: string;
}

export interface ActionGroup<ActionGroupIds extends string> {
  id: ActionGroupIds;
  name: string;
}

export type ActionGroupIdsOf<T> = T extends ActionGroup<infer groups>
  ? groups
  : T extends Readonly<ActionGroup<infer groups>>
  ? groups
  : never;
