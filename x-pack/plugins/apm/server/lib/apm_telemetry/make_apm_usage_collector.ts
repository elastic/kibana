/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import {
  APM_TELEMETRY_DOC_ID,
  ApmTelemetry,
  createApmTelementry,
  getSavedObjectsClient
} from './apm_telemetry';

interface KibanaHapiServer extends Server {
  usage: {
    collectorSet: {
      makeUsageCollector: any;
      register: any;
    };
  };
}

export function makeApmUsageCollector(server: KibanaHapiServer): void {
  const apmUsageCollector = server.usage.collectorSet.makeUsageCollector({
    type: 'apm',
    fetch: async (): Promise<ApmTelemetry> => {
      let apmTelemetrySavedObject;
      const savedObjectsClient = getSavedObjectsClient(server);
      try {
        apmTelemetrySavedObject = await savedObjectsClient.get(
          'apm-telemetry',
          APM_TELEMETRY_DOC_ID
        );
      } catch (err) {
        return createApmTelementry();
      }
      return apmTelemetrySavedObject.attributes;
    }
  });
  server.usage.collectorSet.register(apmUsageCollector);
}
