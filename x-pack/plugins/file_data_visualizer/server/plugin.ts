/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { i18n } from '@kbn/i18n';
import {
  CoreSetup,
  CoreStart,
  /* Logger,*/ Plugin,
  PluginInitializerContext,
} from 'src/core/server';
// import { schema } from '@kbn/config-schema';
// import { fileUploadRoutes } from './routes';
// import { initFileUploadTelemetry } from './telemetry';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/server';
// import { UI_SETTING_MAX_FILE_SIZE, MAX_FILE_SIZE } from '../common';
import { StartDeps } from './types';

interface SetupDeps {
  usageCollection: UsageCollectionSetup;
}

export class FileUploadPlugin implements Plugin {
  // private readonly _logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    // this._logger = initializerContext.logger.get();
  }

  async setup(coreSetup: CoreSetup<StartDeps, unknown>, plugins: SetupDeps) {
    // fileUploadRoutes(coreSetup, this._logger);
    // initFileUploadTelemetry(coreSetup, plugins.usageCollection);
  }

  start(core: CoreStart) {}
}
