/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { ActionGroup } from './alert_type';

export const RecoveredActionGroup: ActionGroup<'recovered'> = {
  id: 'recovered',
  name: i18n.translate('xpack.alerts.builtinActionGroups.recovered', {
    defaultMessage: 'Recovered',
  }),
};

type UnwrapArray<T> = T extends Array<infer Element> ? Element : T;
type ActionGroupIdsOf<T> = UnwrapArray<T> extends ActionGroup<infer IDs> ? IDs : never;
export type BuiltInActionGroupIds = ActionGroupIdsOf<typeof getBuiltinActionGroups>;
export type ValidActionGroupIds = Exclude<string, BuiltInActionGroupIds>;

export function getBuiltinActionGroups<ActionGroupIds extends string>(): Array<
  ActionGroup<ActionGroupIds | ActionGroupIdsOf<typeof RecoveredActionGroup>>
> {
  return [RecoveredActionGroup];
}
