/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObservabilityPluginSetup } from '@kbn/observability-plugin/server';
import {
  ApmDataAccessPluginSetup,
  ApmDataAccessPluginStart,
} from '@kbn/apm-data-access-plugin/server';
import {
  RuleRegistryPluginSetupContract,
  RuleRegistryPluginStartContract,
} from '@kbn/rule-registry-plugin/server';

/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface ConfigSchema {}

export interface InvestigateAppSetupDependencies {
  observability: ObservabilityPluginSetup;
  ruleRegistry: RuleRegistryPluginSetupContract;
  apmDataAccess: ApmDataAccessPluginSetup;
}

export interface InvestigateAppStartDependencies {
  ruleRegistry: RuleRegistryPluginStartContract;
  apmDataAccess: ApmDataAccessPluginStart;
}

export interface InvestigateAppServerSetup {}

export interface InvestigateAppServerStart {}
