/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, CoreStart, Plugin, Logger } from '@kbn/core/server';

import {
  FieldsMetadataPluginCoreSetup,
  FieldsMetadataServerSetup,
  FieldsMetadataServerStart,
  FieldsMetadataServerPluginSetupDeps,
  FieldsMetadataServerPluginStartDeps,
} from './types';
import { initFieldsMetadataServer } from './fields_metadata_server';
import { FieldsMetadataService } from './services/fields_metadata';
import { FieldsMetadataBackendLibs } from './lib/shared_types';

export class FieldsMetadataPlugin
  implements
    Plugin<
      FieldsMetadataServerSetup,
      FieldsMetadataServerStart,
      FieldsMetadataServerPluginSetupDeps,
      FieldsMetadataServerPluginStartDeps
    >
{
  private readonly logger: Logger;
  private libs!: FieldsMetadataBackendLibs;
  private fieldsMetadataService: FieldsMetadataService;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();

    this.fieldsMetadataService = new FieldsMetadataService(this.logger);
  }

  public setup(core: FieldsMetadataPluginCoreSetup, plugins: FieldsMetadataServerPluginSetupDeps) {
    const fieldsMetadata = this.fieldsMetadataService.setup();

    this.libs = {
      getStartServices: () => core.getStartServices(),
      logger: this.logger,
      plugins,
      router: core.http.createRouter(),
    };

    // Register server side APIs
    initFieldsMetadataServer(this.libs);

    return {
      registerIntegrationFieldsExtractor: fieldsMetadata.registerIntegrationFieldsExtractor,
    };
  }

  public start(_core: CoreStart, _plugins: FieldsMetadataServerPluginStartDeps) {
    const fieldsMetadata = this.fieldsMetadataService.start();

    return { getClient: fieldsMetadata.getClient };
  }
}
