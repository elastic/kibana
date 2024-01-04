/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

import { CONNECTORS_INDEX } from '@kbn/search-connectors';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { isIndexNotFoundException } from '@kbn/search-connectors/utils/identify_exceptions';

interface Telemetry {
  native: {
    total: number;
  };
  clients: {
    total: number;
  };
}

const defaultTelemetryMetrics: Telemetry = {
  native: {
    total: 0,
  },
  clients: {
    total: 0,
  },
};

/**
 * Register the telemetry collector
 */

export const registerTelemetryUsageCollector = (usageCollection: UsageCollectionSetup) => {
  const telemetryUsageCollector = usageCollection.makeUsageCollector<Telemetry>({
    type: 'connectors_serverless',
    isReady: () => true,
    schema: {
      native: {
        total: { type: 'long' },
      },
      clients: {
        total: { type: 'long' },
      },
    },
    async fetch({ esClient }) {
      return await fetchTelemetryMetrics(esClient);
    },
  });
  usageCollection.registerCollector(telemetryUsageCollector);
};

/**
 * Fetch the aggregated telemetry metrics
 */

// @ts-ignore
export const fetchTelemetryMetrics = async (client: ElasticsearchClient): Promise<Telemetry> => {
  try {
    const [nativeCountResponse, clientsCountResponse] = await Promise.all([
      client.count({
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
      }),
      client.count({
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
      }),
    ]);

    return {
      native: {
        total: nativeCountResponse.count,
      },
      clients: {
        total: clientsCountResponse.count,
      },
    } as Telemetry;
  } catch (error) {
    if (isIndexNotFoundException(error)) {
      return defaultTelemetryMetrics;
    }
  }
};
