/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  RuleRegistryPluginSetupContract as RuleRegistryPluginSetup,
  RuleRegistryPluginStartContract as RuleRegistryPluginStart,
} from '../../rule_registry/server';

export interface SessionViewSetupPlugins {
  ruleRegistry: RuleRegistryPluginSetup;
}

export interface SessionViewStartPlugins {
  ruleRegistry: RuleRegistryPluginStart;
}
