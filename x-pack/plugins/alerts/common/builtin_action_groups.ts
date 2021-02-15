/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ActionGroup } from './alert_type';

export const RecoveredActionGroup: Readonly<ActionGroup> = {
  id: 'recovered',
  name: i18n.translate('xpack.alerts.builtinActionGroups.recovered', {
    defaultMessage: 'Recovered',
  }),
};

export function getBuiltinActionGroups(customRecoveryGroup?: ActionGroup): ActionGroup[] {
  return [customRecoveryGroup ?? Object.freeze(RecoveredActionGroup)];
}
