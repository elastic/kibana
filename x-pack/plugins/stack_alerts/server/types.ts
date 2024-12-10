/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginStartContract as TriggersActionsUiStartContract } from '@kbn/triggers-actions-ui-plugin/server';
export type {
  RuleType,
  RuleParamsAndRefs,
  RuleExecutorOptions,
  RuleTypeParams,
  AlertingServerSetup,
} from '@kbn/alerting-plugin/server';
import { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { AlertingServerSetup } from '@kbn/alerting-plugin/server';

// this plugin's dependendencies
export interface StackAlertsDeps {
  alerting: AlertingServerSetup;
  features: FeaturesPluginSetup;
}

export interface StackAlertsStartDeps {
  triggersActionsUi: TriggersActionsUiStartContract;
}
