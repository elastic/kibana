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
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { CspAppService } from './lib/csp_app_services';
import type {
  CspServerPluginSetup,
  CspServerPluginStart,
  CspServerPluginSetupDeps,
  CspServerPluginStartDeps,
  CspRequestHandlerContext,
  CspServerPluginStartServices,
} from './types';
import { defineRoutes } from './routes';
import { setupSavedObjects } from './saved_objects';
import { initializeCspIndices } from './create_indices/create_indices';
import { initializeCspTransforms } from './create_transforms/create_transforms';
import {
  isCspPackageInstalled,
  onPackagePolicyPostCreateCallback,
  removeCspRulesInstancesCallback,
} from './fleet_integration/fleet_integration';
import { CLOUD_SECURITY_POSTURE_PACKAGE_NAME } from '../common/constants';
import { updateAgentConfiguration } from './routes/configuration/update_rules_configuration';

import {
  removeFindingsStatsTask,
  scheduleFindingsStatsTask,
  setupFindingsStatsTask,
} from './tasks/findings_stats_task';

export interface CspAppContext {
  logger: Logger;
  service: CspAppService;
  security: SecurityPluginSetup;
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
      security: plugins.security,
    };

    setupSavedObjects(core.savedObjects);

    const router = core.http.createRouter<CspRequestHandlerContext>();

    // Register server side APIs
    defineRoutes(router, cspAppContext);

    const coreStartServices = core.getStartServices();
    this.setupCspTasks(plugins.taskManager, coreStartServices, this.logger);

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
          request: KibanaRequest
        ): Promise<PackagePolicy> => {
          if (packagePolicy.package?.name === CLOUD_SECURITY_POSTURE_PACKAGE_NAME) {
            await this.initialize(core, plugins.taskManager);

            const soClient = (await context.core).savedObjects.client;
            const esClient = (await context.core).elasticsearch.client.asCurrentUser;
            await onPackagePolicyPostCreateCallback(this.logger, packagePolicy, soClient);
            const userAuth = await plugins.security.authc.getCurrentUser(request);
            const updatedPackagePolicy = await updateAgentConfiguration(
              plugins.fleet.packagePolicyService,
              packagePolicy,
              esClient,
              soClient,
              userAuth
            );
            return updatedPackagePolicy;
          }

          return packagePolicy;
        }
      );

      plugins.fleet.registerExternalCallback(
        'postPackagePolicyDelete',
        async (deletedPackagePolicies: DeepReadonly<DeletePackagePoliciesResponse>) => {
          for (const deletedPackagePolicy of deletedPackagePolicies) {
            if (deletedPackagePolicy.package?.name === CLOUD_SECURITY_POSTURE_PACKAGE_NAME) {
              const soClient = core.savedObjects.createInternalRepository();
              await removeCspRulesInstancesCallback(deletedPackagePolicy, soClient, this.logger);

              const isPackageExists = await isCspPackageInstalled(soClient, this.logger);

              if (isPackageExists) {
                await this.uninstallResources(plugins.taskManager, this.logger);
              }
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
    await initializeCspIndices(core.elasticsearch.client.asInternalUser, this.logger);
    await initializeCspTransforms(core.elasticsearch.client.asInternalUser, this.logger);
    await scheduleFindingsStatsTask(taskManager, this.logger);
  }

  async uninstallResources(taskManager: TaskManagerStartContract, logger: Logger): Promise<void> {
    await removeFindingsStatsTask(taskManager, logger);
  }

  setupCspTasks(
    taskManager: TaskManagerSetupContract,
    coreStartServices: CspServerPluginStartServices,
    logger: Logger
  ) {
    setupFindingsStatsTask(taskManager, coreStartServices, logger);
  }
}
