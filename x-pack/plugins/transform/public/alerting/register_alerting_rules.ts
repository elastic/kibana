/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TriggersAndActionsUIPublicPluginSetup } from '../../../triggers_actions_ui/public';
import type { PluginSetupContract as AlertingSetup } from '../../../alerting/public';
import { registerTransformHealthRule } from './transform_health_rule_type';
import { PLUGIN, TRANSFORM_RULE_TYPE } from '../../common/constants';

export function registerAlertingRules(
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup,
  alerting?: AlertingSetup
) {
  registerTransformHealthRule(triggersActionsUi);

  if (alerting) {
    registerNavigation(alerting);
  }
}

export function registerNavigation(alerting: AlertingSetup) {
  alerting.registerNavigation(PLUGIN.ID, TRANSFORM_RULE_TYPE.TRANSFORM_HEALTH, (alert) => {
    return '';
  });
}
