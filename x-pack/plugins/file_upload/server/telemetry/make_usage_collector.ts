/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';

import {
  createTelemetry,
  getSavedObjectsClient,
  Telemetry,
  TELEMETRY_DOC_ID,
  TelemetrySavedObject,
} from './telemetry';

// TODO this type should be defined by the platform
interface KibanaHapiServer extends Server {
  usage: {
    collectorSet: {
      makeUsageCollector: any;
      register: any;
    };
  };
}

export function makeUsageCollector(server: KibanaHapiServer): void {
  const fileUploadUsageCollector = server.usage.collectorSet.makeUsageCollector({
    type: 'fileUpload',
    fetch: async (): Promise<Telemetry> => {
      try {
        const savedObjectsClient = getSavedObjectsClient(server);
        const telemetrySavedObject = (await savedObjectsClient.get(
          'file-upload-telemetry',
          TELEMETRY_DOC_ID
        )) as TelemetrySavedObject;
        return telemetrySavedObject.attributes;
      } catch (err) {
        return createTelemetry();
      }
    },
  });
  server.usage.collectorSet.register(fileUploadUsageCollector);
}
