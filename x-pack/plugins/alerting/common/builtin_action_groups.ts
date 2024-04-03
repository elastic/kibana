/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RecoveredActionGroupId, ActionGroup } from '@kbn/alerting-types';
import { RecoveredActionGroup } from '@kbn/alerting-types';

export type ReservedActionGroups<RecoveryActionGroupId extends string> =
  | RecoveryActionGroupId
  | RecoveredActionGroupId;

export type WithoutReservedActionGroups<
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> = ActionGroupIds extends ReservedActionGroups<RecoveryActionGroupId> ? never : ActionGroupIds;

export function getBuiltinActionGroups<RecoveryActionGroupId extends string>(
  customRecoveryGroup?: ActionGroup<RecoveryActionGroupId>
): [ActionGroup<ReservedActionGroups<RecoveryActionGroupId>>] {
  return [customRecoveryGroup ?? RecoveredActionGroup];
}

export type { RecoveredActionGroupId, DefaultActionGroupId } from '@kbn/alerting-types';

export { RecoveredActionGroup } from '@kbn/alerting-types';
