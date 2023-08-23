/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { DeepReadonly } from 'utility-types';
import type {
  PostDeletePackagePoliciesResponse,
  PackagePolicy,
  NewPackagePolicy,
  UpdatePackagePolicy,
} from '@kbn/fleet-plugin/common';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { isCspPackage } from '../common/utils/helpers';
import { isSubscriptionAllowed } from '../common/utils/subscription';
import { cleanupCredentials } from '../common/utils/helpers';
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
  isCspPackagePolicyInstalled,
  onPackagePolicyPostCreateCallback,
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

  /**
   * CSP is initialized when the Fleet package is installed.
   * either directly after installation, or
   * when the plugin is started and a package is present.
   */
  #isInitialized: boolean = false;

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
      isPluginInitialized: () => this.#isInitialized,
    });

    const coreStartServices = core.getStartServices();
    this.setupCspTasks(plugins.taskManager, coreStartServices, this.logger);
    registerCspmUsageCollector(this.logger, coreStartServices, plugins.usageCollection);

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
        async (packagePolicy: NewPackagePolicy): Promise<NewPackagePolicy> => {
          const license = await plugins.licensing.refresh();
          if (isCspPackage(packagePolicy.package?.name)) {
            if (!isSubscriptionAllowed(this.isCloudEnabled, license)) {
              throw new Error(
                'To use this feature you must upgrade your subscription or start a trial'
              );
            }

            if (!isSingleEnabledInput(packagePolicy.inputs)) {
              throw new Error('Only one enabled input is allowed per policy');
            }
          }

          return packagePolicy;
        }
      );

      plugins.fleet.registerExternalCallback(
        'packagePolicyCreate',
        async (
          packagePolicy: NewPackagePolicy,
          soClient: SavedObjectsClientContract
        ): Promise<NewPackagePolicy> => {
          if (isCspPackage(packagePolicy.package?.name)) {
            return cleanupCredentials(packagePolicy);
          }

          return packagePolicy;
        }
      );

      plugins.fleet.registerExternalCallback(
        'packagePolicyUpdate',
        async (
          packagePolicy: UpdatePackagePolicy,
          soClient: SavedObjectsClientContract
        ): Promise<UpdatePackagePolicy> => {
          if (isCspPackage(packagePolicy.package?.name)) {
            return cleanupCredentials(packagePolicy);
          }

          return packagePolicy;
        }
      );

      plugins.fleet.registerExternalCallback(
        'packagePolicyPostCreate',
        async (
          packagePolicy: PackagePolicy,
          soClient: SavedObjectsClientContract
        ): Promise<PackagePolicy> => {
          if (isCspPackage(packagePolicy.package?.name)) {
            await this.initialize(core, plugins.taskManager);
            await onPackagePolicyPostCreateCallback(this.logger, packagePolicy, soClient);

            return packagePolicy;
          }

          return packagePolicy;
        }
      );

      plugins.fleet.registerExternalCallback(
        'packagePolicyPostDelete',
        async (deletedPackagePolicies: DeepReadonly<PostDeletePackagePoliciesResponse>) => {
          for (const deletedPackagePolicy of deletedPackagePolicies) {
            if (isCspPackage(deletedPackagePolicy.package?.name)) {
              const soClient = core.savedObjects.createInternalRepository();
              const packagePolicyService = plugins.fleet.packagePolicyService;
              const isPackageExists = await isCspPackagePolicyInstalled(
                packagePolicyService,
                soClient,
                this.logger
              );
              if (!isPackageExists) {
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

  /**
   * Initialization is idempotent and required for (re)creating indices and transforms.
   */
  async initialize(core: CoreStart, taskManager: TaskManagerStartContract): Promise<void> {
    this.logger.debug('initialize');
    const esClient = core.elasticsearch.client.asInternalUser;
    await initializeCspIndices(esClient, this.logger);
    await initializeCspTransforms(esClient, this.logger);
    await scheduleFindingsStatsTask(taskManager, this.logger);
    this.#isInitialized = true;
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

const isSingleEnabledInput = (inputs: NewPackagePolicy['inputs']): boolean =>
  inputs.filter((i) => i.enabled).length === 1;
