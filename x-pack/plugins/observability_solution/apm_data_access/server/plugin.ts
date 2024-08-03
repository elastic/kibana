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
} from '@kbn/core/server';
import { APMDataAccessConfig } from '.';
import { ApmDataAccessPluginSetup, ApmDataAccessPluginStart } from './types';
import { migrateLegacyAPMIndicesToSpaceAware } from './saved_objects/migrations/migrate_legacy_apm_indices_to_space_aware';
import {
  apmIndicesSavedObjectDefinition,
  getApmIndicesSavedObject,
} from './saved_objects/apm_indices';
import { getServices } from './services/get_services';

export class ApmDataAccessPlugin
  implements Plugin<ApmDataAccessPluginSetup, ApmDataAccessPluginStart>
{
  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
  }

  public setup(core: CoreSetup): ApmDataAccessPluginSetup {
    // retrieve APM indices from config
    const apmDataAccessConfig = this.initContext.config.get<APMDataAccessConfig>();
    const apmIndicesFromConfigFile = apmDataAccessConfig.indices;

    const getApmIndices = async (savedObjectsClient: SavedObjectsClientContract) => {
      const apmIndicesFromSavedObject = await getApmIndicesSavedObject(savedObjectsClient);
      return { ...apmIndicesFromConfigFile, ...apmIndicesFromSavedObject };
    };
    // register saved object
    core.savedObjects.registerType(apmIndicesSavedObjectDefinition);

    // expose
    return {
      apmIndicesFromConfigFile,
      getApmIndices,
      getServices,
    };
  }

  public start(core: CoreStart) {
    const logger = this.initContext.logger.get();
    // TODO: remove in 9.0
    migrateLegacyAPMIndicesToSpaceAware({ coreStart: core, logger }).catch((e) => {
      logger.error('Failed to run migration making APM indices space aware');
      logger.error(e);
    });
    return {};
  }

  public stop() {}
}
