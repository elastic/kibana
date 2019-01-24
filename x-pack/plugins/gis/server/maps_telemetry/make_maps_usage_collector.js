/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getMapsTelemetry
} from './maps_telemetry';

export function makeMapsUsageCollector(server) {
  const mapsUsageCollector = server.usage.collectorSet.makeUsageCollector({
    type: 'maps',
    fetch: async callCluster => {
      try {
        const mapsTelemetry = await getMapsTelemetry(server, callCluster);
        return mapsTelemetry.attributes;
      } catch (err) {
        server.log(['warning'], `Error loading maps telemetry: ${err}`);
      }
    }
  });
  server.usage.collectorSet.register(mapsUsageCollector);
}
