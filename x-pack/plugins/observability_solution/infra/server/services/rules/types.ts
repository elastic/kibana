/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingServerSetup } from '@kbn/alerting-plugin/server';
import { IRuleDataClient, RuleRegistryPluginSetupContract } from '@kbn/rule-registry-plugin/server';
export interface RulesServiceSetupDeps {
  alerting: AlertingServerSetup;
  ruleRegistry: RuleRegistryPluginSetupContract;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RulesServiceStartDeps {}

export interface RulesServiceSetup {
  ruleDataClient: IRuleDataClient;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RulesServiceStart {}

export type RuleRegistrationContext = 'observability.logs' | 'observability.metrics';
