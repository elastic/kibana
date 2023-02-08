/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from '@kbn/core/server';
import {
  CloudDefendPluginSetup,
  CloudDefendPluginStart,
  CloudDefendPluginStartDeps,
} from './types';
import { INTEGRATION_PACKAGE_NAME } from '../common/constants';
import { setupRoutes } from './routes/setup_routes';

export class CloudDefendPlugin implements Plugin<CloudDefendPluginSetup, CloudDefendPluginStart> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup<CloudDefendPluginStartDeps, CloudDefendPluginStart>) {
    this.logger.debug('cloudDefend: Setup');
    const router = core.http.createRouter();

    setupRoutes({
      core,
      logger: this.logger,
    });

    return {};
  }

  public start(core: CoreStart, plugins: CloudDefendPluginStartDeps): CloudDefendPluginStart {
    this.logger.debug('cloudDefend: Started');

    plugins.fleet.fleetSetupCompleted().then(async () => {
      const packageInfo = await plugins.fleet.packageService.asInternalUser.getInstallation(
        INTEGRATION_PACKAGE_NAME
      );

      console.log(packageInfo);
    });

    return {};
  }

  public stop() {}
}
