/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  SavedObjectsClient,
  Logger,
} from '../../../../src/core/server';

import { SecurityPluginSetup } from '../../security/server';
import { setupDashboardModeRequestInterceptor } from './interceptors';

import { getUiSettings } from './ui_settings';

interface DashboardModeServerSetupDependencies {
  security?: SecurityPluginSetup;
}

export class DashboardModeServerPlugin implements Plugin<void, void> {
  private initializerContext: PluginInitializerContext;
  private logger?: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public setup(core: CoreSetup, { security }: DashboardModeServerSetupDependencies) {
    this.logger = this.initializerContext.logger.get();

    core.uiSettings.register(getUiSettings());

    const getUiSettingsClient = async () => {
      const [coreStart] = await core.getStartServices();
      const { savedObjects, uiSettings } = coreStart;
      const savedObjectsClient = new SavedObjectsClient(savedObjects.createInternalRepository());

      return uiSettings.asScopedToClient(savedObjectsClient);
    };

    if (security) {
      const dashboardModeRequestInterceptor = setupDashboardModeRequestInterceptor({
        http: core.http,
        security,
        getUiSettingsClient,
      });

      core.http.registerOnPostAuth(dashboardModeRequestInterceptor);

      this.logger.debug(`registered DashboardModeRequestInterceptor`);
    }
  }

  public start(core: CoreStart) {}

  public stop() {}
}
