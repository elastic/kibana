/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  Plugin,
  CoreSetup,
  CoreStart,
  Logger,
} from '@kbn/core/server';
import type { ServerlessSecurityConfig } from './config';
import { getProductAppFeatures } from '../common/pli/pli_features';

import type {
  SecuritySolutionServerlessPluginSetup,
  SecuritySolutionServerlessPluginStart,
  SecuritySolutionServerlessPluginSetupDeps,
  SecuritySolutionServerlessPluginStartDeps,
} from './types';

export class SecuritySolutionServerlessPlugin
  implements
    Plugin<
      SecuritySolutionServerlessPluginSetup,
      SecuritySolutionServerlessPluginStart,
      SecuritySolutionServerlessPluginSetupDeps,
      SecuritySolutionServerlessPluginStartDeps
    >
{
  private config: ServerlessSecurityConfig;
  private readonly logger: Logger;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<ServerlessSecurityConfig>();
    this.logger = this.initializerContext.logger.get();
  }

  public setup(_coreSetup: CoreSetup, pluginsSetup: SecuritySolutionServerlessPluginSetupDeps) {
    // securitySolutionEss plugin should always be disabled when securitySolutionServerless is enabled.
    // This check is an additional layer of security to prevent double registrations when
    // `plugins.forceEnableAllPlugins` flag is enabled).
    const shouldRegister = pluginsSetup.securitySolutionEss == null;

    this.logger.info(
      `Security Solution running with product tiers:\n${JSON.stringify(
        this.config.productTypes,
        null,
        2
      )}`
    );

    if (shouldRegister) {
      pluginsSetup.securitySolution.setAppFeatures(getProductAppFeatures(this.config.productTypes));
    }

    pluginsSetup.ml.setFeaturesEnabled({ ad: true, dfa: true, nlp: false });
    return {};
  }

  public start(_coreStart: CoreStart, pluginsSetup: SecuritySolutionServerlessPluginStartDeps) {
    return {};
  }

  public stop() {}
}
