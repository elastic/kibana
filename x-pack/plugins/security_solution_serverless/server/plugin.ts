/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, Plugin, CoreSetup, CoreStart } from '@kbn/core/server';
import type { ServerlessSecurityConfig } from './config';
import { getProductAppFeatures } from '../common/pli/pli_features';

import type {
  SecuritySolutionServerlessPluginSetup,
  SecuritySolutionServerlessPluginStart,
  SecuritySolutionServerlessPluginSetupDeps,
  SecuritySolutionServerlessPluginStartDeps,
} from './types';
import { EndpointUsageReportingTask } from './endpoint/tasks/usage_reporting_task';

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
  private endpointUsageReportingTask: EndpointUsageReportingTask | undefined;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<ServerlessSecurityConfig>();
  }

  public setup(_coreSetup: CoreSetup, pluginsSetup: SecuritySolutionServerlessPluginSetupDeps) {
    // securitySolutionEss plugin should always be disabled when securitySolutionServerless is enabled.
    // This check is an additional layer of security to prevent double registrations when
    // `plugins.forceEnableAllPlugins` flag is enabled).
    const shouldRegister = pluginsSetup.securitySolutionEss == null;

    if (shouldRegister) {
      pluginsSetup.securitySolution.setAppFeatures(getProductAppFeatures(this.config.productTypes));
    }

    pluginsSetup.ml.setFeaturesEnabled({ ad: true, dfa: true, nlp: false });

    this.endpointUsageReportingTask = new EndpointUsageReportingTask({
      logFactory: this.initializerContext.logger,
      core: _coreSetup,
      taskManager: pluginsSetup.taskManager,
    });
    return {};
  }

  public start(_coreStart: CoreStart, pluginsSetup: SecuritySolutionServerlessPluginStartDeps) {
    this.endpointUsageReportingTask?.start({ taskManager: pluginsSetup.taskManager });
    return {};
  }

  public stop() {}
}
