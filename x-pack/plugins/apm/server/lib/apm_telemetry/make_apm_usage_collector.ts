/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import {
  APM_TELEMETRY_DOC_ID,
  createApmTelementry,
  getSavedObjectsClient
} from './apm_telemetry';

// TODO this type should be defined by the platform
interface KibanaHapiServer extends Server {
  usage: {
    collectorSet: {
      makeUsageCollector: (options: unknown) => unknown;
      register: (options: unknown) => unknown;
    };
  };
}

export function makeApmUsageCollector(server: KibanaHapiServer): void {
  const apmUsageCollector = server.usage.collectorSet.makeUsageCollector({
    type: 'apm',
    fetch: async () => {
      const savedObjectsClient = getSavedObjectsClient(server);
      try {
        const apmTelemetrySavedObject = await savedObjectsClient.get(
          'apm-telemetry',
          APM_TELEMETRY_DOC_ID
        );
        return apmTelemetrySavedObject.attributes;
      } catch (err) {
        return createApmTelementry();
      }
    }
  });
  server.usage.collectorSet.register(apmUsageCollector);
}
