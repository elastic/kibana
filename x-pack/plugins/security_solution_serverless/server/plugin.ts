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

import { getProductAppFeatures } from '../common/pli/pli_features';

import type { ServerlessSecurityConfig } from './config';
import type {
  SecuritySolutionServerlessPluginSetup,
  SecuritySolutionServerlessPluginStart,
  SecuritySolutionServerlessPluginSetupDeps,
  SecuritySolutionServerlessPluginStartDeps,
} from './types';
import { SecurityUsageReportingTask } from './task_manager/usage_reporting_task';
import { cloudSecurityMetringTaskProperties } from './cloud_security/cloud_security_metering_task_config';
import { METERING_TASK as ENDPOINT_METERING_TASK } from './endpoint/constants/metering';
import {
  endpointMeteringService,
  setEndpointPackagePolicyServerlessFlag,
} from './endpoint/services';

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
  private endpointUsageReportingTask: SecurityUsageReportingTask | undefined;
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

    this.cspmUsageReportingTask = new SecurityUsageReportingTask({
      core: _coreSetup,
      logFactory: this.initializerContext.logger,
      config: this.config,
      taskManager: pluginsSetup.taskManager,
      cloudSetup: pluginsSetup.cloudSetup,
      taskType: cloudSecurityMetringTaskProperties.taskType,
      taskTitle: cloudSecurityMetringTaskProperties.taskTitle,
      version: cloudSecurityMetringTaskProperties.version,
      meteringCallback: cloudSecurityMetringTaskProperties.meteringCallback,
    });

    this.endpointUsageReportingTask = new SecurityUsageReportingTask({
      core: _coreSetup,
      logFactory: this.initializerContext.logger,
      config: this.config,
      taskType: ENDPOINT_METERING_TASK.TYPE,
      taskTitle: ENDPOINT_METERING_TASK.TITLE,
      version: ENDPOINT_METERING_TASK.VERSION,
      meteringCallback: endpointMeteringService.getUsageRecords,
      taskManager: pluginsSetup.taskManager,
      cloudSetup: pluginsSetup.cloudSetup,
    });
    return {};
  }

  public start(_coreStart: CoreStart, pluginsSetup: SecuritySolutionServerlessPluginStartDeps) {
    const internalESClient = _coreStart.elasticsearch.client.asInternalUser;
    const internalSOClient = _coreStart.savedObjects.createInternalRepository();

    this.cspmUsageReportingTask?.start({
      taskManager: pluginsSetup.taskManager,
      interval: cloudSecurityMetringTaskProperties.interval,
    });

    this.endpointUsageReportingTask?.start({
      taskManager: pluginsSetup.taskManager,
      interval: ENDPOINT_METERING_TASK.INTERVAL,
    });

    setEndpointPackagePolicyServerlessFlag(
      internalSOClient,
      internalESClient,
      pluginsSetup.fleet.packagePolicyService
    );
    return {};
  }

  public stop() {}
}
