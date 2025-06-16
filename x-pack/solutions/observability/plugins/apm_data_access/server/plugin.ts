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
  KibanaRequest,
} from '@kbn/core/server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import type {
  ApmDataAccessPluginSetup,
  ApmDataAccessPluginStart,
  ApmDataAccessServerDependencies,
  ApmDataAccessServerSetupDependencies,
} from './types';
import { getServices } from './services/get_services';
import type { ApmDataAccessPrivilegesCheck } from './lib/check_privileges';
import { checkPrivileges } from './lib/check_privileges';

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

  public start(core: CoreStart, plugins: ApmDataAccessServerDependencies) {
    const getApmIndicesWithInternalUserFn = (request: KibanaRequest) => {
      const soClient = core.savedObjects.getScopedClient(request);
      return plugins.apmSourcesAccess.getApmIndices(soClient);
    };

    const startServices = {
      hasPrivileges: ({ request }: Pick<ApmDataAccessPrivilegesCheck, 'request'>) =>
        checkPrivileges({
          request,
          getApmIndices: getApmIndicesWithInternalUserFn,
          security: plugins.security,
        }),
    };

    return startServices;
  }

  public stop() {}
}
