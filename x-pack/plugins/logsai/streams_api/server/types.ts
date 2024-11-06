/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable @typescript-eslint/no-empty-interface*/

import type {
  RuleRegistryPluginSetupContract,
  RuleRegistryPluginStartContract,
} from '@kbn/rule-registry-plugin/server';
import type {
  PluginStartContract as AlertingPluginStart,
  PluginSetupContract as AlertingPluginSetup,
} from '@kbn/alerting-plugin/server';

export interface ConfigSchema {}

export interface StreamsAPISetupDependencies {
  ruleRegistry: RuleRegistryPluginSetupContract;
  alerting: AlertingPluginSetup;
}

export interface StreamsAPIStartDependencies {
  ruleRegistry: RuleRegistryPluginStartContract;
  alerting: AlertingPluginStart;
}

export interface StreamsAPIServerSetup {}

export interface StreamsAPIClient {}

export interface StreamsAPIServerStart {}
