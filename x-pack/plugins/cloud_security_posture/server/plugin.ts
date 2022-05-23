/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KibanaRequest,
  RequestHandlerContext,
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';
import { DeepReadonly } from 'utility-types';
import { DeletePackagePoliciesResponse, PackagePolicy } from '@kbn/fleet-plugin/common';
import { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { CspAppService } from './lib/csp_app_services';
import type {
  CspServerPluginSetup,
  CspServerPluginStart,
  CspServerPluginSetupDeps,
  CspServerPluginStartDeps,
  CspRequestHandlerContext,
} from './types';
import { defineRoutes } from './routes';
import { cspRuleTemplateAssetType } from './saved_objects/csp_rule_template';
import { cspRuleAssetType } from './saved_objects/csp_rule_type';
import { initializeCspTransformsIndices } from './create_indices/create_indices';
import { initializeCspTransforms } from './create_transforms/create_transforms';
import {
  onPackagePolicyPostCreateCallback,
  onPackagePolicyDeleteCallback,
} from './fleet_integration/fleet_integration';
import { CLOUD_SECURITY_POSTURE_PACKAGE_NAME } from '../common/constants';

import {
  initializeFindingsAggregationTask,
  scheduleIndexScoreTask,
} from './task_manager/task_manager_setup';
import { findingsAggregationConfig } from './task_manager/task_manager_config';
export interface CspAppContext {
  logger: Logger;
  service: CspAppService;
}

export class CspPlugin
  implements
    Plugin<
      CspServerPluginSetup,
      CspServerPluginStart,
      CspServerPluginSetupDeps,
      CspServerPluginStartDeps
    >
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  private readonly CspAppService = new CspAppService();

  public setup(
    core: CoreSetup<CspServerPluginStartDeps, CspServerPluginStart>,
    plugins: CspServerPluginSetupDeps
  ): CspServerPluginSetup {
    const cspAppContext: CspAppContext = {
      logger: this.logger,
      service: this.CspAppService,
    };

    core.savedObjects.registerType(cspRuleAssetType);
    core.savedObjects.registerType(cspRuleTemplateAssetType);

    const router = core.http.createRouter<CspRequestHandlerContext>();

    // Register server side APIs
    defineRoutes(router, cspAppContext);

    const coreStartServices = core.getStartServices();

    initializeFindingsAggregationTask(
      plugins.taskManager,
      findingsAggregationConfig.id!,
      coreStartServices,
      this.logger
    );
    return {};
  }

  public start(core: CoreStart, plugins: CspServerPluginStartDeps): CspServerPluginStart {
    this.CspAppService.start({
      ...plugins.fleet,
    });

    plugins.fleet.fleetSetupCompleted().then(async () => {
      const packageInfo = await plugins.fleet.packageService.asInternalUser.getInstallation(
        CLOUD_SECURITY_POSTURE_PACKAGE_NAME
      );

      // If package is installed we want to make sure all needed assets are installed
      if (packageInfo) {
        // noinspection ES6MissingAwait
        this.initialize(core, plugins.taskManager);
      }

      plugins.fleet.registerExternalCallback(
        'packagePolicyPostCreate',
        async (
          packagePolicy: PackagePolicy,
          context: RequestHandlerContext,
          _: KibanaRequest
        ): Promise<PackagePolicy> => {
          if (packagePolicy.package?.name === CLOUD_SECURITY_POSTURE_PACKAGE_NAME) {
            await this.initialize(core, plugins.taskManager);

            const soClient = (await context.core).savedObjects.client;
            await onPackagePolicyPostCreateCallback(this.logger, packagePolicy, soClient);
          }

          return packagePolicy;
        }
      );

      plugins.fleet.registerExternalCallback(
        'postPackagePolicyDelete',
        async (deletedPackagePolicies: DeepReadonly<DeletePackagePoliciesResponse>) => {
          for (const deletedPackagePolicy of deletedPackagePolicies) {
            if (deletedPackagePolicy.package?.name === CLOUD_SECURITY_POSTURE_PACKAGE_NAME) {
              await onPackagePolicyDeleteCallback(
                this.logger,
                deletedPackagePolicy,
                core.savedObjects.createInternalRepository(),
                plugins.taskManager,
                findingsAggregationConfig.id!
              );
            }
          }
        }
      );
    });

    return {};
  }

  public stop() {}

  async initialize(core: CoreStart, taskManager: TaskManagerStartContract): Promise<void> {
    this.logger.debug('initialize');
    await initializeCspTransformsIndices(core.elasticsearch.client.asInternalUser, this.logger);
    await initializeCspTransforms(core.elasticsearch.client.asInternalUser, this.logger);
    scheduleIndexScoreTask(taskManager, findingsAggregationConfig, this.logger);
  }
}
