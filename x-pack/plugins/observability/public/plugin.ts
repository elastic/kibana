/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  AppMountParameters,
  CoreSetup,
  DEFAULT_APP_CATEGORIES,
  Plugin as PluginClass,
  PluginInitializerContext,
} from '../../../../src/core/public';
import { ObservabilityDataAccessService } from './data_access_service';
import { Setup } from './typings/data_access_service';
import { dataFetcherRegistry, Registry, getDataFetcher } from './data_fetcher';

export interface ObservabilityPluginSetup {
  dataAccess: Setup;
  dataFetcherRegistry: Registry;
}

export type ObservabilityPluginStart = void;

export class Plugin implements PluginClass<ObservabilityPluginSetup, ObservabilityPluginStart> {
  private readonly observabilityDataAccessService = new ObservabilityDataAccessService();

  constructor(context: PluginInitializerContext) {}

  public setup(core: CoreSetup) {
    core.application.register({
      id: 'observability-overview',
      title: 'Overview',
      order: 8000,
      appRoute: '/app/observability',
      category: DEFAULT_APP_CATEGORIES.observability,

      mount: async (params: AppMountParameters<unknown>) => {
        this.observabilityDataAccessService.getDataProvider('');
        // Load application bundle
        const { renderApp } = await import('./application');
        // Get start services
        const [coreStart] = await core.getStartServices();

        return renderApp(coreStart, params, {
          observabilityData: this.observabilityDataAccessService,
        });
      },
    });

    return {
      dataAccess: this.observabilityDataAccessService.setup(core),
      dataFetcherRegistry,
    };
  }
  public start() {}
}
