/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin } from 'src/core/server';
import { fileUploadRoutes } from './routes';
import { initFileUploadTelemetry } from './telemetry';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/server';

interface SetupDeps {
  usageCollection: UsageCollectionSetup;
}

export class FileUploadPlugin implements Plugin {
  async setup(coreSetup: CoreSetup, plugins: SetupDeps) {
    fileUploadRoutes(coreSetup.http.createRouter());

    initFileUploadTelemetry(coreSetup, plugins.usageCollection);
  }

  start(core: CoreStart) {}
}
