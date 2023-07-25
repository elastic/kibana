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
import { SecurityUsageReportingTask } from './task_manager/usage_reporting_task';
import { cloudSecurityMetringTaskProperties } from './cloud_security/metering_tasks_configs';

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
  private cspmUsageReportingTask: SecurityUsageReportingTask | undefined;

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

    this.cspmUsageReportingTask = new SecurityUsageReportingTask({
      core: _coreSetup,
      logFactory: this.initializerContext.logger,
      taskManager: pluginsSetup.taskManager,
      cloudSetup: pluginsSetup.cloudSetup,
      taskType: cloudSecurityMetringTaskProperties.taskType,
      taskTitle: cloudSecurityMetringTaskProperties.taskTitle,
      version: cloudSecurityMetringTaskProperties.version,
      meteringCallback: cloudSecurityMetringTaskProperties.meteringCallback,
    });

    return {};
  }

  public start(_coreStart: CoreStart, pluginsSetup: SecuritySolutionServerlessPluginStartDeps) {
    this.cspmUsageReportingTask?.start({
      taskManager: pluginsSetup.taskManager,
      interval: cloudSecurityMetringTaskProperties.interval,
    });
    return {};
  }

  public stop() {}
}
