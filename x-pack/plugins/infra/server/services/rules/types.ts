/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginSetupContract as AlertingPluginSetup } from '../../../../alerting/server';
import {
  createLifecycleExecutor,
  IRuleDataClient,
  RuleRegistryPluginSetupContract,
} from '../../../../rule_registry/server';

type LifecycleRuleExecutorCreator = ReturnType<typeof createLifecycleExecutor>;

export interface RulesServiceSetupDeps {
  alerting: AlertingPluginSetup;
  ruleRegistry: RuleRegistryPluginSetupContract;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RulesServiceStartDeps {}

export interface RulesServiceSetup {
  createLifecycleRuleExecutor: LifecycleRuleExecutorCreator;
  ruleDataClient: IRuleDataClient;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RulesServiceStart {}

export type RuleRegistrationContext = 'observability.logs' | 'observability.metrics';
