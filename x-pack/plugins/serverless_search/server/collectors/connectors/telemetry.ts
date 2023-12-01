/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IClusterClient, Logger } from '@kbn/core/server';

import { CONNECTORS_INDEX } from '@kbn/search-connectors';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';

interface Telemetry {
  native: {
    total: number;
  };
  clients: {
    total: number;
  };
}

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

/**
 * Fetch the aggregated telemetry metrics
 */

export const fetchTelemetryMetrics = async (
  client: IClusterClient,
  log: Logger
): Promise<Telemetry> => {
  const defaultTelemetryMetrics: Telemetry = {
    native: {
      total: 0,
    },
    clients: {
      total: 0,
    },
  };

  try {
    const nativeCountResponse = await client.asInternalUser.count({
      index: CONNECTORS_INDEX,
      query: {
        bool: {
          filter: [
            {
              term: {
                is_native: true,
              },
            },
          ],
          must_not: [
            {
              term: {
                service_type: {
                  value: 'elastic-crawler',
                },
              },
            },
          ],
        },
      },
    });

    const clientsCountResponse = await client.asInternalUser.count({
      index: CONNECTORS_INDEX,
      query: {
        bool: {
          filter: [
            {
              term: {
                is_native: false,
              },
            },
          ],
        },
      },
    });

    return {
      native: {
        total: nativeCountResponse.count,
      },
      clients: {
        total: clientsCountResponse.count,
      },
    } as Telemetry;
  } catch (error) {
    log.error(`Failed to retrieve telemetry data: ${error}`);
    return defaultTelemetryMetrics;
  }
};
