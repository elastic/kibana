/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import type { PluginSetupContract, PluginStartContract } from '@kbn/features-plugin/server';
import type {
  PluginSetup as SecuritySolutionPluginSetup,
  PluginStart as SecuritySolutionPluginStart,
} from '@kbn/security-solution-plugin/server';

import type { EssSecurityPluginSetup } from '@kbn/ess-security/server';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessSecurityPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessSecurityPluginStart {}

export interface ServerlessSecurityPluginSetupDependencies {
  security: SecurityPluginSetup;
  securitySolution: SecuritySolutionPluginSetup;
  features: PluginSetupContract;
  essSecurity: EssSecurityPluginSetup;
  ml: MlPluginSetup;
}

export interface ServerlessSecurityPluginStartDependencies {
  security: SecurityPluginStart;
  securitySolution: SecuritySolutionPluginStart;
  features: PluginStartContract;
}
