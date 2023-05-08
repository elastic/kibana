/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/public';
import {
  PluginSetup as SecuritySolutionPluginSetup,
  PluginStart as SecuritySolutionPluginStart,
} from '@kbn/security-solution-plugin/public';
import { ServerlessPluginSetup, ServerlessPluginStart } from '@kbn/serverless/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessSecurityPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessSecurityPluginStart {}

export interface ServerlessSecurityPluginSetupDependencies {
  security: SecurityPluginSetup;
  securitySolution: SecuritySolutionPluginSetup;
  serverless: ServerlessPluginSetup;
}

export interface ServerlessSecurityPluginStartDependencies {
  security: SecurityPluginStart;
  securitySolution: SecuritySolutionPluginStart;
  serverless: ServerlessPluginStart;
}
