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
  SavedObjectsClientContract,
  Logger,
} from '@kbn/core/server';
import { APMDataAccessConfig } from '.';
import {
  ApmDataAccessPluginSetup,
  ApmDataAccessPluginStart,
  ApmDataAccessServerDependencies,
} from './types';
import { migrateLegacyAPMIndicesToSpaceAware } from './saved_objects/migrations/migrate_legacy_apm_indices_to_space_aware';
import {
  apmIndicesSavedObjectDefinition,
  getApmIndicesSavedObject,
} from './saved_objects/apm_indices';
import { getServices } from './services/get_services';
import { ApmDataAccessPrivilegesCheck, checkPrivileges } from './lib/check_privileges';

export class ApmDataAccessPlugin
  implements Plugin<ApmDataAccessPluginSetup, ApmDataAccessPluginStart>
{
  public server?: ApmDataAccessServerDependencies;
  public config: APMDataAccessConfig;
  public logger: Logger;

  constructor(initContext: PluginInitializerContext) {
    this.config = initContext.config.get<APMDataAccessConfig>();
    this.logger = initContext.logger.get();
  }

  getApmIndices = async (savedObjectsClient: SavedObjectsClientContract) => {
    const apmIndicesFromSavedObject = await getApmIndicesSavedObject(savedObjectsClient);
    return { ...this.config.indices, ...apmIndicesFromSavedObject };
  };

  public setup(core: CoreSetup): ApmDataAccessPluginSetup {
    // register saved object
    core.savedObjects.registerType(apmIndicesSavedObjectDefinition);

    // expose
    return {
      apmIndicesFromConfigFile: this.config.indices,
      getApmIndices: this.getApmIndices,
      getServices,
    };
  }

  public start(core: CoreStart, plugins: ApmDataAccessServerDependencies) {
    // TODO: remove in 9.0
    migrateLegacyAPMIndicesToSpaceAware({ coreStart: core, logger: this.logger }).catch((e) => {
      this.logger.error('Failed to run migration making APM indices space aware');
      this.logger.error(e);
    });

    const getApmIndicesWithInternalUserFn = async () => {
      const soClient = core.savedObjects.createInternalRepository();
      return this.getApmIndices(soClient);
    };

    const startServices = {
      hasPrivileges: ({ request }: Pick<ApmDataAccessPrivilegesCheck, 'request'>) =>
        checkPrivileges({
          request,
          getApmIndices: getApmIndicesWithInternalUserFn,
          security: plugins.security,
        }),
    };

    return { ...startServices };
  }

  public stop() {}
}
