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

import { SECURITY_PROJECT_SETTINGS } from '@kbn/serverless-security-settings';
import { getProductProductFeatures } from '../common/pli/pli_features';

import type { ServerlessSecurityConfig } from './config';
import { createConfig } from './config';
import type {
  SecuritySolutionServerlessPluginSetup,
  SecuritySolutionServerlessPluginStart,
  SecuritySolutionServerlessPluginSetupDeps,
  SecuritySolutionServerlessPluginStartDeps,
} from './types';
import { SecurityUsageReportingTask } from './task_manager/usage_reporting_task';
import { cloudSecurityMetringTaskProperties } from './cloud_security/cloud_security_metering_task_config';
import { getProductProductFeaturesConfigurator } from './product_features';
import { METERING_TASK as ENDPOINT_METERING_TASK } from './endpoint/constants/metering';
import {
  endpointMeteringService,
  setEndpointPackagePolicyServerlessFlag,
} from './endpoint/services';
import { enableRuleActions } from './rules/enable_rule_actions';

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
  private cloudSecurityUsageReportingTask: SecurityUsageReportingTask | undefined;
  private endpointUsageReportingTask: SecurityUsageReportingTask | undefined;
  private readonly logger: Logger;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<ServerlessSecurityConfig>();
    this.logger = this.initializerContext.logger.get();
  }

  public setup(coreSetup: CoreSetup, pluginsSetup: SecuritySolutionServerlessPluginSetupDeps) {
    this.config = createConfig(this.initializerContext, pluginsSetup.securitySolution);
    const enabledProductFeatures = getProductProductFeatures(this.config.productTypes);

    // securitySolutionEss plugin should always be disabled when securitySolutionServerless is enabled.
    // This check is an additional layer of security to prevent double registrations when
    // `plugins.forceEnableAllPlugins` flag is enabled. Should never happen in real scenarios.
    const shouldRegister = pluginsSetup.securitySolutionEss == null;
    if (shouldRegister) {
      const productTypesStr = JSON.stringify(this.config.productTypes, null, 2);
      this.logger.info(`Security Solution running with product types:\n${productTypesStr}`);
      const productFeaturesConfigurator = getProductProductFeaturesConfigurator(
        enabledProductFeatures,
        this.config
      );
      pluginsSetup.securitySolution.setProductFeaturesConfigurator(productFeaturesConfigurator);
    }

    enableRuleActions({
      actions: pluginsSetup.actions,
      productFeatureKeys: enabledProductFeatures,
    });

    this.cloudSecurityUsageReportingTask = new SecurityUsageReportingTask({
      core: coreSetup,
      logFactory: this.initializerContext.logger,
      config: this.config,
      taskManager: pluginsSetup.taskManager,
      cloudSetup: pluginsSetup.cloud,
      taskType: cloudSecurityMetringTaskProperties.taskType,
      taskTitle: cloudSecurityMetringTaskProperties.taskTitle,
      version: cloudSecurityMetringTaskProperties.version,
      meteringCallback: cloudSecurityMetringTaskProperties.meteringCallback,
    });

    this.endpointUsageReportingTask = new SecurityUsageReportingTask({
      core: coreSetup,
      logFactory: this.initializerContext.logger,
      config: this.config,
      taskType: ENDPOINT_METERING_TASK.TYPE,
      taskTitle: ENDPOINT_METERING_TASK.TITLE,
      version: ENDPOINT_METERING_TASK.VERSION,
      meteringCallback: endpointMeteringService.getUsageRecords,
      taskManager: pluginsSetup.taskManager,
      cloudSetup: pluginsSetup.cloud,
      options: {
        lookBackLimitMinutes: ENDPOINT_METERING_TASK.LOOK_BACK_LIMIT_MINUTES,
      },
    });

    pluginsSetup.serverless.setupProjectSettings(SECURITY_PROJECT_SETTINGS);

    return {};
  }

  public start(coreStart: CoreStart, pluginsSetup: SecuritySolutionServerlessPluginStartDeps) {
    const internalESClient = coreStart.elasticsearch.client.asInternalUser;
    const internalSOClient = coreStart.savedObjects.createInternalRepository();

    this.cloudSecurityUsageReportingTask?.start({
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
