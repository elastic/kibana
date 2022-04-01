/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginStartContract as TriggersActionsUiStartContract } from '../../triggers_actions_ui/server';
import { PluginSetupContract as AlertingSetup } from '../../alerting/server';

export type {
  PluginSetupContract as AlertingSetup,
  RuleType,
  RuleParamsAndRefs,
  AlertExecutorOptions,
  AlertTypeParams,
} from '../../alerting/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';

// this plugin's dependendencies
export interface StackAlertsDeps {
  alerting: AlertingSetup;
  features: FeaturesPluginSetup;
}

export interface StackAlertsStartDeps {
  triggersActionsUi: TriggersActionsUiStartContract;
}
