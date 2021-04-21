/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RequestHandlerContext } from 'src/core/server';
import { PluginStartContract as TriggersActionsUiStartContract } from '../../triggers_actions_ui/server';
import { PluginSetupContract as AlertingSetup } from '../../alerting/server';
import {
  RuleRegistryPluginSetupContract,
  createLifecycleRuleTypeFactory,
  createThresholdRuleTypeFactory,
} from '../../rule_registry/server';

export {
  PluginSetupContract as AlertingSetup,
  AlertType,
  AlertExecutorOptions,
} from '../../alerting/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { AlertingBuiltinsPlugin as StackAlertsPlugin } from './plugin';
import type { AlertingApiRequestHandlerContext } from '../../alerting/server';

// this plugin's dependendencies
export interface StackAlertsDeps {
  alerting: AlertingSetup;
  features: FeaturesPluginSetup;
  ruleRegistry: RuleRegistryPluginSetupContract;
}

export interface StackAlertsStartDeps {
  triggersActionsUi: TriggersActionsUiStartContract;
}

export interface StackAlertsRequestHandlerContext extends RequestHandlerContext {
  alerting: AlertingApiRequestHandlerContext;
}

export type StackAlertsPluginRouter = IRouter<StackAlertsRequestHandlerContext>;

export type StackAlertsRuleRegistry = ReturnType<StackAlertsPlugin['setup']>['ruleRegistry'];
export const createThresholdRuleType = createThresholdRuleTypeFactory<StackAlertsRuleRegistry>();
export const createLifecycleRuleType = createLifecycleRuleTypeFactory<StackAlertsRuleRegistry>();
