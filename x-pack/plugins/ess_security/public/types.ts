/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginSetup as SecuritySolutionPluginSetup,
  PluginStart as SecuritySolutionPluginStart,
} from '@kbn/security-solution-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EssSecurityPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EssSecurityPluginStart {}

export interface EssSecurityPluginSetupDependencies {
  securitySolution: SecuritySolutionPluginSetup;
}

export interface EssSecurityPluginStartDependencies {
  securitySolution: SecuritySolutionPluginStart;
}
