/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { mapValues } from 'lodash';
import { getDatasetQualityServerRouteRepository } from './routes';
import { registerRoutes } from './routes/register_routes';
import { DatasetQualityRouteHandlerResources } from './routes/types';
import {
  DatasetQualityPluginSetupDependencies,
  DatasetQualityPluginStart,
  DatasetQualityPluginStartDependencies,
} from './types';

export class DatasetQualityServerPlugin implements Plugin {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  setup(
    core: CoreSetup<DatasetQualityPluginStartDependencies, DatasetQualityPluginStart>,
    plugins: DatasetQualityPluginSetupDependencies
  ) {
    const resourcePlugins = mapValues(plugins, (value, key) => {
      return {
        setup: value,
        start: () =>
          core.getStartServices().then((services) => {
            const [, pluginsStartContracts] = services;
            return pluginsStartContracts[key as keyof DatasetQualityPluginStartDependencies];
          }),
      };
    }) as DatasetQualityRouteHandlerResources['plugins'];

    const getEsCapabilities = async () => {
      return await core.getStartServices().then((services) => {
        const [coreStart] = services;
        return coreStart.elasticsearch.getCapabilities();
      });
    };

    registerRoutes({
      core,
      logger: this.logger,
      repository: getDatasetQualityServerRouteRepository(),
      plugins: resourcePlugins,
      getEsCapabilities,
    });

    return {};
  }

  start() {
    return {};
  }
}
