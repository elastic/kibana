/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { ActionGroup } from './alert_type';

export const ResolvedActionGroup: ActionGroup = {
  id: 'resolved',
  name: i18n.translate('xpack.alerts.builtinActionGroups.resolved', {
    defaultMessage: 'Resolved',
  }),
};

export function getBuiltinActionGroups(): ActionGroup[] {
  return [ResolvedActionGroup];
}
