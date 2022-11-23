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
import type { DeepReadonly } from 'utility-types';
import type {
  DeletePackagePoliciesResponse,
  PackagePolicy,
  NewPackagePolicy,
} from '@kbn/fleet-plugin/common';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { isSubscriptionAllowed } from '../common/utils/subscription';
import type {
  CspServerPluginSetup,
  CspServerPluginStart,
  CspServerPluginSetupDeps,
  CspServerPluginStartDeps,
  CspServerPluginStartServices,
} from './types';
import { setupRoutes } from './routes/setup_routes';
import { setupSavedObjects } from './saved_objects';
import { initializeCspIndices } from './create_indices/create_indices';
import { initializeCspTransforms } from './create_transforms/create_transforms';
import {
  isCspPackage,
  isCspPackageInstalled,
  onPackagePolicyPostCreateCallback,
  removeCspRulesInstancesCallback,
} from './fleet_integration/fleet_integration';
import { CLOUD_SECURITY_POSTURE_PACKAGE_NAME } from '../common/constants';
import {
  removeFindingsStatsTask,
  scheduleFindingsStatsTask,
  setupFindingsStatsTask,
} from './tasks/findings_stats_task';
import { registerCspmUsageCollector } from './lib/telemetry/collectors/register';

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
  private isCloudEnabled?: boolean;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup<CspServerPluginStartDeps, CspServerPluginStart>,
    plugins: CspServerPluginSetupDeps
  ): CspServerPluginSetup {
    setupSavedObjects(core.savedObjects);

    setupRoutes({
      core,
      logger: this.logger,
    });

    const coreStartServices = core.getStartServices();
    this.setupCspTasks(plugins.taskManager, coreStartServices, this.logger);
    registerCspmUsageCollector(this.logger, plugins.usageCollection);

    this.isCloudEnabled = plugins.cloud.isCloudEnabled;

    return {};
  }

  public start(core: CoreStart, plugins: CspServerPluginStartDeps): CspServerPluginStart {
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
        'packagePolicyCreate',
        async (
          packagePolicy: NewPackagePolicy,
          _context: RequestHandlerContext,
          _request: KibanaRequest
        ): Promise<NewPackagePolicy> => {
          const license = await plugins.licensing.refresh();
          if (isCspPackage(packagePolicy.package?.name)) {
            if (!isSubscriptionAllowed(this.isCloudEnabled, license)) {
              throw new Error(
                'To use this feature you must upgrade your subscription or start a trial'
              );
            }
          }

          return packagePolicy;
        }
      );

      plugins.fleet.registerExternalCallback(
        'packagePolicyPostCreate',
        async (
          packagePolicy: PackagePolicy,
          context: RequestHandlerContext,
          _: KibanaRequest
        ): Promise<PackagePolicy> => {
          if (isCspPackage(packagePolicy.package?.name)) {
            await this.initialize(core, plugins.taskManager);

            const soClient = (await context.core).savedObjects.client;
            await onPackagePolicyPostCreateCallback(this.logger, packagePolicy, soClient);

            return packagePolicy;
          }

          return packagePolicy;
        }
      );

      plugins.fleet.registerExternalCallback(
        'postPackagePolicyDelete',
        async (deletedPackagePolicies: DeepReadonly<DeletePackagePoliciesResponse>) => {
          for (const deletedPackagePolicy of deletedPackagePolicies) {
            if (isCspPackage(deletedPackagePolicy.package?.name)) {
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
    const esClient = core.elasticsearch.client.asInternalUser;
    await initializeCspIndices(esClient, this.logger);
    await initializeCspTransforms(esClient, this.logger);
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
