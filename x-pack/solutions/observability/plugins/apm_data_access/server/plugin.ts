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
} from '@kbn/core/server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import type {
  ApmDataAccessPluginSetup,
  ApmDataAccessPluginStart,
  ApmDataAccessServerSetupDependencies,
} from './types';
import { getServices } from './services/get_services';

export class ApmDataAccessPlugin
  implements Plugin<ApmDataAccessPluginSetup, ApmDataAccessPluginStart>
{
  public config?: APMIndices;
  public logger: Logger;

  constructor(initContext: PluginInitializerContext) {
    this.logger = initContext.logger.get();
  }

  public setup(
    core: CoreSetup,
    plugins: ApmDataAccessServerSetupDependencies
  ): ApmDataAccessPluginSetup {
    this.config = plugins.apmSourcesAccess.apmIndicesFromConfigFile;

    // expose
    return {
      // TODO: Deprecate and replace with apmSourcesAccess
      apmIndicesFromConfigFile: this.config,
      // TODO: Deprecate and replace with apmSourcesAccess
      getApmIndices: plugins.apmSourcesAccess.getApmIndices,
      getServices,
    };
  }

  public start(_core: CoreStart): ApmDataAccessPluginStart {
    return {};
  }

  public stop() {}
}
