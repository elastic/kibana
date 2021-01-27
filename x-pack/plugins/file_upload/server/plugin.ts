/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from 'src/core/server';
import { fileUploadRoutes } from './routes';
import { initTelemetry } from './telemetry';

export class FileUploadPlugin implements Plugin {
  async setup(core: CoreSetup, plugins: SetupDeps) {
    fileUploadRoutes(coreSetup.http.createRouter());

    initTelemetry(coreSetup, plugins.usageCollection);
  }

  start(core: CoreStart) {}
}
