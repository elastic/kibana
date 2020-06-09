/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { initRoutes } from './routes/file_upload';
import { setInternalRepository } from './kibana_server_services';
import { registerFileUploadUsageCollector, fileUploadTelemetryMappingsType } from './telemetry';

export class FileUploadPlugin {
  constructor() {
    this.router = null;
  }

  setup(core, plugins) {
    core.savedObjects.registerType(fileUploadTelemetryMappingsType);
    this.router = core.http.createRouter();
    registerFileUploadUsageCollector(plugins.usageCollection);
  }

  start(core) {
    initRoutes(this.router, core.savedObjects.getSavedObjectsRepository);
    setInternalRepository(core.savedObjects.createInternalRepository);
  }
}
