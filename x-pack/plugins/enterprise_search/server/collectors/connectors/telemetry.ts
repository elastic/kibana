/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';

import { collectConnectorStats } from '@kbn/search-connectors';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';

import { ConnectorStats } from '../../../common/types';

interface Telemetry {
  connectors: ConnectorStats[];
}

const defaultTelemetryMetrics: Telemetry = {
  connectors: [],
};

/**
 * Register the telemetry collector
 */

export const registerTelemetryUsageCollector = (
  usageCollection: UsageCollectionSetup,
  log: Logger
) => {
  const telemetryUsageCollector = usageCollection.makeUsageCollector<Telemetry>({
    type: 'connectors',
    isReady: () => true,
    schema: {
      connectors: {
        type: 'array',
        items: {
          id: { type: 'keyword' },
          serviceType: { type: 'keyword' },
          isNative: { type: 'boolean' },
          isDeleted: { type: 'boolean' },
          status: { type: 'keyword' },
          indexName: { type: 'keyword' },
          dlsEnabled: { type: 'boolean' },
          sslEnabled: { type: 'boolean' },
          fetchSelectively: { type: 'boolean' },
          textExtractionServiceEnabled: { type: 'boolean' },
          documents: {
            total: { type: 'long' },
            volume: { type: 'long' },
            inLastSync: { type: 'long' },
          },
          dataSourceSpecific: {
            confluence: {
              dataSourceType: { type: 'keyword' },
            },
            github: {
              isCloud: { type: 'boolean' },
            },
            jira: {
              dataSourceType: { type: 'keyword' },
            },
            mongodb: {
              directConnect: { type: 'boolean' },
            },
            mssql: {
              validateHost: { type: 'boolean' },
              tables: { type: 'long' },
            },
            mysql: {
              tables: { type: 'long' },
            },
            oracle: {
              tables: { type: 'long' },
            },
            postgresql: {
              tables: { type: 'long' },
            },
            slack: {
              autoJoinChannelsEnabled: { type: 'boolean' },
              syncUsersEnabled: { type: 'boolean' },
              fetchLastNDays: { type: 'long' },
            },
            zoom: {
              recordingAge: { type: 'long' },
            },
          },
          scheduling: {
            accessControl: {
              enabled: { type: 'boolean' },
              interval: { type: 'text' },
            },
            full: {
              enabled: { type: 'boolean' },
              interval: { type: 'text' },
            },
            incremental: {
              enabled: { type: 'boolean' },
              interval: { type: 'text' },
            },
          },
          syncRules: {
            active: {
              withBasicRules: { type: 'boolean' },
              withAdvancedRules: { type: 'boolean' },
            },
            draft: {
              withBasicRules: { type: 'boolean' },
              withAdvancedRules: { type: 'boolean' },
            },
          },
          ingestPipeline: {
            name: { type: 'keyword' },
            extractBinaryContent: { type: 'boolean' },
            reduceWhitespace: { type: 'boolean' },
            runMLInference: { type: 'boolean' },
          },
          syncJobs: {
            overall: {
              total: { type: 'long' },
              last30Days: {
                overall: {
                  total: { type: 'long' },
                  manual: { type: 'long' },
                  scheduled: { type: 'long' },
                  completed: { type: 'long' },
                  errored: { type: 'long' },
                  canceled: { type: 'long' },
                  suspended: { type: 'long' },
                  idle: { type: 'long' },
                  running: { type: 'long' },
                  totalDurationSeconds: { type: 'long' },
                },
                accessControl: {
                  total: { type: 'long' },
                  manual: { type: 'long' },
                  scheduled: { type: 'long' },
                  completed: { type: 'long' },
                  errored: { type: 'long' },
                  canceled: { type: 'long' },
                  suspended: { type: 'long' },
                  idle: { type: 'long' },
                  running: { type: 'long' },
                  totalDurationSeconds: { type: 'long' },
                },
                full: {
                  total: { type: 'long' },
                  manual: { type: 'long' },
                  scheduled: { type: 'long' },
                  completed: { type: 'long' },
                  errored: { type: 'long' },
                  canceled: { type: 'long' },
                  suspended: { type: 'long' },
                  idle: { type: 'long' },
                  running: { type: 'long' },
                  totalDurationSeconds: { type: 'long' },
                },
                incremental: {
                  total: { type: 'long' },
                  manual: { type: 'long' },
                  scheduled: { type: 'long' },
                  completed: { type: 'long' },
                  errored: { type: 'long' },
                  canceled: { type: 'long' },
                  suspended: { type: 'long' },
                  idle: { type: 'long' },
                  running: { type: 'long' },
                  totalDurationSeconds: { type: 'long' },
                },
              },
              last7Days: {
                overall: {
                  total: { type: 'long' },
                  manual: { type: 'long' },
                  scheduled: { type: 'long' },
                  completed: { type: 'long' },
                  errored: { type: 'long' },
                  canceled: { type: 'long' },
                  suspended: { type: 'long' },
                  idle: { type: 'long' },
                  running: { type: 'long' },
                  totalDurationSeconds: { type: 'long' },
                },
                accessControl: {
                  total: { type: 'long' },
                  manual: { type: 'long' },
                  scheduled: { type: 'long' },
                  completed: { type: 'long' },
                  errored: { type: 'long' },
                  canceled: { type: 'long' },
                  suspended: { type: 'long' },
                  idle: { type: 'long' },
                  running: { type: 'long' },
                  totalDurationSeconds: { type: 'long' },
                },
                full: {
                  total: { type: 'long' },
                  manual: { type: 'long' },
                  scheduled: { type: 'long' },
                  completed: { type: 'long' },
                  errored: { type: 'long' },
                  canceled: { type: 'long' },
                  suspended: { type: 'long' },
                  idle: { type: 'long' },
                  running: { type: 'long' },
                  totalDurationSeconds: { type: 'long' },
                },
                incremental: {
                  total: { type: 'long' },
                  manual: { type: 'long' },
                  scheduled: { type: 'long' },
                  completed: { type: 'long' },
                  errored: { type: 'long' },
                  canceled: { type: 'long' },
                  suspended: { type: 'long' },
                  idle: { type: 'long' },
                  running: { type: 'long' },
                  totalDurationSeconds: { type: 'long' },
                },
              },
            },
            withTextExtractionServiceEnabled: {
              total: { type: 'long' },
              last30Days: {
                overall: {
                  total: { type: 'long' },
                  manual: { type: 'long' },
                  scheduled: { type: 'long' },
                  completed: { type: 'long' },
                  errored: { type: 'long' },
                  canceled: { type: 'long' },
                  suspended: { type: 'long' },
                  idle: { type: 'long' },
                  running: { type: 'long' },
                  totalDurationSeconds: { type: 'long' },
                },
                accessControl: {
                  total: { type: 'long' },
                  manual: { type: 'long' },
                  scheduled: { type: 'long' },
                  completed: { type: 'long' },
                  errored: { type: 'long' },
                  canceled: { type: 'long' },
                  suspended: { type: 'long' },
                  idle: { type: 'long' },
                  running: { type: 'long' },
                  totalDurationSeconds: { type: 'long' },
                },
                full: {
                  total: { type: 'long' },
                  manual: { type: 'long' },
                  scheduled: { type: 'long' },
                  completed: { type: 'long' },
                  errored: { type: 'long' },
                  canceled: { type: 'long' },
                  suspended: { type: 'long' },
                  idle: { type: 'long' },
                  running: { type: 'long' },
                  totalDurationSeconds: { type: 'long' },
                },
                incremental: {
                  total: { type: 'long' },
                  manual: { type: 'long' },
                  scheduled: { type: 'long' },
                  completed: { type: 'long' },
                  errored: { type: 'long' },
                  canceled: { type: 'long' },
                  suspended: { type: 'long' },
                  idle: { type: 'long' },
                  running: { type: 'long' },
                  totalDurationSeconds: { type: 'long' },
                },
              },
              last7Days: {
                overall: {
                  total: { type: 'long' },
                  manual: { type: 'long' },
                  scheduled: { type: 'long' },
                  completed: { type: 'long' },
                  errored: { type: 'long' },
                  canceled: { type: 'long' },
                  suspended: { type: 'long' },
                  idle: { type: 'long' },
                  running: { type: 'long' },
                  totalDurationSeconds: { type: 'long' },
                },
                accessControl: {
                  total: { type: 'long' },
                  manual: { type: 'long' },
                  scheduled: { type: 'long' },
                  completed: { type: 'long' },
                  errored: { type: 'long' },
                  canceled: { type: 'long' },
                  suspended: { type: 'long' },
                  idle: { type: 'long' },
                  running: { type: 'long' },
                  totalDurationSeconds: { type: 'long' },
                },
                full: {
                  total: { type: 'long' },
                  manual: { type: 'long' },
                  scheduled: { type: 'long' },
                  completed: { type: 'long' },
                  errored: { type: 'long' },
                  canceled: { type: 'long' },
                  suspended: { type: 'long' },
                  idle: { type: 'long' },
                  running: { type: 'long' },
                  totalDurationSeconds: { type: 'long' },
                },
                incremental: {
                  total: { type: 'long' },
                  manual: { type: 'long' },
                  scheduled: { type: 'long' },
                  completed: { type: 'long' },
                  errored: { type: 'long' },
                  canceled: { type: 'long' },
                  suspended: { type: 'long' },
                  idle: { type: 'long' },
                  running: { type: 'long' },
                  totalDurationSeconds: { type: 'long' },
                },
              },
            },
          },
        },
      },
    },
    async fetch({ esClient }) {
      return await fetchTelemetryMetrics(esClient, log);
    },
  });
  usageCollection.registerCollector(telemetryUsageCollector);
};

/**
 * Fetch the aggregated telemetry metrics
 */
export const fetchTelemetryMetrics = async (
  client: ElasticsearchClient,
  log: Logger
): Promise<Telemetry> => {
  try {
    const connectors = await collectConnectorStats(client);
    return {
      connectors,
    } as Telemetry;
  } catch (error) {
    log.error(`Couldn't fetch telemetry due to error: ${error}`);
    return defaultTelemetryMetrics;
  }
};
