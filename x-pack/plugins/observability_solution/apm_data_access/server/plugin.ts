/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { APMDataAccessConfig } from '.';
import {
  apmIndicesSavedObjectDefinition,
  getApmIndicesSavedObject,
} from './saved_objects/apm_indices';
import { migrateLegacyAPMIndicesToSpaceAware } from './saved_objects/migrations/migrate_legacy_apm_indices_to_space_aware';
import { getServices } from './services/get_services';
import { ApmDataAccessPluginSetup, ApmDataAccessPluginStart } from './types';

export class ApmDataAccessPlugin
  implements Plugin<ApmDataAccessPluginSetup, ApmDataAccessPluginStart>
{
  public config: APMDataAccessConfig;
  public logger: Logger;

  constructor(initContext: PluginInitializerContext) {
    this.config = initContext.config.get<APMDataAccessConfig>();
    this.logger = initContext.logger.get();
  }

  public setup(core: CoreSetup): ApmDataAccessPluginSetup {
    // register saved object
    core.savedObjects.registerType(apmIndicesSavedObjectDefinition);

    const getApmIndices = async (soClient: SavedObjectsClientContract) => {
      const apmIndicesFromSavedObject = await getApmIndicesSavedObject(soClient);
      return { ...this.config.indices, ...apmIndicesFromSavedObject };
    };

    // expose
    return {
      apmIndicesFromConfigFile: this.config.indices,
      getApmIndices,
      getServices,
    };
  }

  public start(core: CoreStart) {
    // TODO: remove in 9.0
    migrateLegacyAPMIndicesToSpaceAware({ coreStart: core, logger: this.logger }).catch((e) => {
      this.logger.error('Failed to run migration making APM indices space aware');
      this.logger.error(e);
    });

    return {};
  }

  public stop() {}
}
