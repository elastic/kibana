/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginSetupContract as AlertingPluginSetup } from '../../../../alerting/server';
import {
  createLifecycleRuleTypeFactory,
  RuleDataClient,
  RuleRegistryPluginSetupContract,
} from '../../../../rule_registry/server';

export interface RulesServiceSetupDeps {
  alerting: AlertingPluginSetup;
  ruleRegistry: RuleRegistryPluginSetupContract;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RulesServiceStartDeps {}

export interface RulesServiceSetup {
  ruleDataClient: RuleDataClient;
  createLifecycleRuleType: ReturnType<typeof createLifecycleRuleTypeFactory>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RulesServiceStart {}

export type RuleConsumerNames = 'observability.logs' | 'observability.metrics';
