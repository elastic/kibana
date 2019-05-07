/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';

import {
  createMlTelemetry,
  getSavedObjectsClient,
  ML_TELEMETRY_DOC_ID,
  MlTelemetry,
  MlTelemetrySavedObject,
} from './ml_telemetry';

// TODO this type should be defined by the platform
interface KibanaHapiServer extends Server {
  usage: {
    collectorSet: {
      makeUsageCollector: any;
      register: any;
    };
  };
}

export function makeMlUsageCollector(server: KibanaHapiServer): void {
  const mlUsageCollector = server.usage.collectorSet.makeUsageCollector({
    type: 'ml',
    isReady: () => true,
    fetch: async (): Promise<MlTelemetry> => {
      try {
        const savedObjectsClient = getSavedObjectsClient(server);
        const mlTelemetrySavedObject = (await savedObjectsClient.get(
          'ml-telemetry',
          ML_TELEMETRY_DOC_ID
        )) as MlTelemetrySavedObject;
        return mlTelemetrySavedObject.attributes;
      } catch (err) {
        return createMlTelemetry();
      }
    },
  });
  server.usage.collectorSet.register(mlUsageCollector);
}
