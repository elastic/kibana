/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IClusterClient, Logger } from '@kbn/core/server';

import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { fetchTelemetryMetrics, Telemetry } from '@kbn/search-connectors';

/**
 * Register the telemetry collector
 */

export const registerTelemetryUsageCollector = (
  usageCollection: UsageCollectionSetup,
  client: IClusterClient,
  log: Logger
) => {
  const telemetryUsageCollector = usageCollection.makeUsageCollector<Telemetry>({
    type: 'connectors_serverless',
    fetch: async () => fetchTelemetryMetrics(client, log),
    isReady: () => true,
    schema: {
      native: {
        total: { type: 'long' },
      },
      clients: {
        total: { type: 'long' },
      },
    },
  });
  usageCollection.registerCollector(telemetryUsageCollector);
};
