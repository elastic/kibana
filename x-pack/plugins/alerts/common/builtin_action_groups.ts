/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { ActionGroup } from './alert_type';

export type DefaultActionGroupId = 'default';

export type RecoveredActionGroupId = typeof RecoveredActionGroup['id'];
export const RecoveredActionGroup: Readonly<ActionGroup<'recovered'>> = Object.freeze({
  id: 'recovered',
  name: i18n.translate('xpack.alerts.builtinActionGroups.recovered', {
    defaultMessage: 'Recovered',
  }),
});

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
