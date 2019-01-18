/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  MAPS_TELEMETRY_DOC_ID,
  createMapsTelemetry,
  getSavedObjectsClient
} from './maps_telemetry';

export function makeMapsUsageCollector(server) {
  const mapsUsageCollector = server.usage.collectorSet.makeUsageCollector({
    type: 'maps',
    fetch: async () => {
      const savedObjectsClient = getSavedObjectsClient(server);
      try {
        const mapsTelemetrySavedObject = await savedObjectsClient.get(
          'maps-telemetry',
          MAPS_TELEMETRY_DOC_ID
        );
        return mapsTelemetrySavedObject.attributes;
      } catch (err) {
        return createMapsTelemetry();
      }
    }
  });
  server.usage.collectorSet.register(mapsUsageCollector);
}
