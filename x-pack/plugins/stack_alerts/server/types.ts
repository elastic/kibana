/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginStartContract as TriggersActionsUiStartContract } from '../../triggers_actions_ui/server';
import { PluginSetupContract as AlertingSetup } from '../../alerts/server';

export {
  PluginSetupContract as AlertingSetup,
  AlertType,
  AlertExecutorOptions,
} from '../../alerts/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';

// this plugin's dependendencies
export interface StackAlertsDeps {
  alerts: AlertingSetup;
  features: FeaturesPluginSetup;
}

export interface StackAlertsStartDeps {
  triggersActionsUi: TriggersActionsUiStartContract;
}
