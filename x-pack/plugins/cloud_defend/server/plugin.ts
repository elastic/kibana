/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { PackagePolicy, NewPackagePolicy } from '@kbn/fleet-plugin/common';
import {
  CloudDefendPluginSetup,
  CloudDefendPluginStart,
  CloudDefendPluginStartDeps,
  CloudDefendPluginSetupDeps,
} from './types';
import { setupRoutes } from './routes/setup_routes';
import { isCloudDefendPackage } from '../common/utils/helpers';
import { isSubscriptionAllowed } from '../common/utils/subscription';
import { onPackagePolicyPostCreateCallback } from './lib/fleet_util';
import { registerCloudDefendUsageCollector } from './lib/telemetry/collectors/register';

export class CloudDefendPlugin implements Plugin<CloudDefendPluginSetup, CloudDefendPluginStart> {
  private readonly logger: Logger;
  private isCloudEnabled?: boolean;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup<CloudDefendPluginStartDeps, CloudDefendPluginStart>,
    plugins: CloudDefendPluginSetupDeps
  ) {
    this.logger.debug('cloudDefend: Setup');

    setupRoutes({
      core,
      logger: this.logger,
    });

    const coreStartServices = core.getStartServices();
    registerCloudDefendUsageCollector(this.logger, coreStartServices, plugins.usageCollection);

    this.isCloudEnabled = plugins.cloud.isCloudEnabled;

    return {};
  }

  public start(core: CoreStart, plugins: CloudDefendPluginStartDeps): CloudDefendPluginStart {
    this.logger.debug('cloudDefend: Started');

    plugins.fleet.fleetSetupCompleted().then(async () => {
      plugins.fleet.registerExternalCallback(
        'packagePolicyCreate',
        async (packagePolicy: NewPackagePolicy): Promise<NewPackagePolicy> => {
          const license = await plugins.licensing.refresh();
          if (isCloudDefendPackage(packagePolicy.package?.name)) {
            if (!isSubscriptionAllowed(this.isCloudEnabled, license)) {
              throw new Error(
                'To use this feature you must upgrade your subscription or start a trial'
              );
            }
          }

          return packagePolicy;
        }
      );
    });

    plugins.fleet.registerExternalCallback(
      'packagePolicyPostCreate',
      async (
        packagePolicy: PackagePolicy,
        soClient: SavedObjectsClientContract
      ): Promise<PackagePolicy> => {
        if (isCloudDefendPackage(packagePolicy.package?.name)) {
          await onPackagePolicyPostCreateCallback(this.logger, packagePolicy, soClient);
          return packagePolicy;
        }

        return packagePolicy;
      }
    );

    return {};
  }

  public stop() {}
}
