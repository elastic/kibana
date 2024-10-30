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
import { registerProductFeatures, getSecurityProductTier } from './product_features';
import { METERING_TASK as ENDPOINT_METERING_TASK } from './endpoint/constants/metering';
import {
  endpointMeteringService,
  setEndpointPackagePolicyServerlessBillingFlags,
} from './endpoint/services';
import { NLPCleanupTask } from './task_manager/nlp_cleanup_task/nlp_cleanup_task';
import { telemetryEvents } from './telemetry/event_based_telemetry';
import { UsageReportingService } from './common/services/usage_reporting_service';

export class SecuritySolutionServerlessPlugin
  implements
    Plugin<
      SecuritySolutionServerlessPluginSetup,
      SecuritySolutionServerlessPluginStart,
      SecuritySolutionServerlessPluginSetupDeps,
      SecuritySolutionServerlessPluginStartDeps
    >
{
  private kibanaVersion: string;
  private config: ServerlessSecurityConfig;
  private cloudSecurityUsageReportingTask: SecurityUsageReportingTask | undefined;
  private endpointUsageReportingTask: SecurityUsageReportingTask | undefined;
  private nlpCleanupTask: NLPCleanupTask | undefined;
  private readonly logger: Logger;
  private readonly usageReportingService: UsageReportingService;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.kibanaVersion = initializerContext.env.packageInfo.version;
    this.config = this.initializerContext.config.get<ServerlessSecurityConfig>();
    this.logger = this.initializerContext.logger.get();

    this.usageReportingService = new UsageReportingService(
      this.config.usageApi,
      this.kibanaVersion
    );

    const productTypesStr = JSON.stringify(this.config.productTypes, null, 2);
    this.logger.info(`Security Solution running with product types:\n${productTypesStr}`);
  }

  public setup(coreSetup: CoreSetup, pluginsSetup: SecuritySolutionServerlessPluginSetupDeps) {
    this.config = createConfig(this.initializerContext, pluginsSetup.securitySolution);

    // Register product features
    const enabledProductFeatures = getProductProductFeatures(this.config.productTypes);

    registerProductFeatures(pluginsSetup, enabledProductFeatures, this.config);

    // Register telemetry events
    telemetryEvents.forEach((eventConfig) => coreSetup.analytics.registerEventType(eventConfig));

    // Setup project uiSettings whitelisting
    pluginsSetup.serverless.setupProjectSettings(SECURITY_PROJECT_SETTINGS);

    // Tasks
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
      usageReportingService: this.usageReportingService,
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
      usageReportingService: this.usageReportingService,
    });

    this.nlpCleanupTask = new NLPCleanupTask({
      core: coreSetup,
      logFactory: this.initializerContext.logger,
      productTier: getSecurityProductTier(this.config, this.logger),
      taskManager: pluginsSetup.taskManager,
    });

    return {};
  }

  public start(coreStart: CoreStart, pluginsSetup: SecuritySolutionServerlessPluginStartDeps) {
    const internalESClient = coreStart.elasticsearch.client.asInternalUser;
    const internalSOClient = coreStart.savedObjects.createInternalRepository();

    this.cloudSecurityUsageReportingTask
      ?.start({
        taskManager: pluginsSetup.taskManager,
        interval: this.config.cloudSecurityUsageReportingTaskInterval,
      })
      .catch(() => {});

    this.endpointUsageReportingTask
      ?.start({
        taskManager: pluginsSetup.taskManager,
        interval: this.config.usageReportingTaskInterval,
      })
      .catch(() => {});

    this.nlpCleanupTask?.start({ taskManager: pluginsSetup.taskManager }).catch(() => {});

    setEndpointPackagePolicyServerlessBillingFlags(
      internalSOClient,
      internalESClient,
      pluginsSetup.fleet.packagePolicyService
    ).catch(() => {});
    return {};
  }

  public stop() {}
}
