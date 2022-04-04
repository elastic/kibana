/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LicenseType } from '../../licensing/common/types';
import { RecoveredActionGroupId, DefaultActionGroupId } from './builtin_action_groups';

interface ConsumerPrivileges {
  read: boolean;
  all: boolean;
}

interface ActionVariable {
  name: string;
  description: string;
}
export interface RuleType<
  ActionGroupIds extends Exclude<string, RecoveredActionGroupId> = DefaultActionGroupId,
  RecoveryActionGroupId extends string = RecoveredActionGroupId
> {
  id: string;
  name: string;
  actionGroups: Array<ActionGroup<ActionGroupIds>>;
  recoveryActionGroup: ActionGroup<RecoveryActionGroupId>;
  actionVariables: {
    context: ActionVariable[];
    state: ActionVariable[];
    params: ActionVariable[];
  };
  defaultActionGroupId: ActionGroupIds;
  producer: string;
  minimumLicenseRequired: LicenseType;
  isExportable: boolean;
  ruleTaskTimeout?: string;
  defaultScheduleInterval?: string;
  doesSetRecoveryContext?: boolean;
  enabledInLicense: boolean;
  authorizedConsumers: Record<string, ConsumerPrivileges>;
  hasDiagnostics: boolean;
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
