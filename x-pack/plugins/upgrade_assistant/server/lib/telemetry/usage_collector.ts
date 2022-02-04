/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, ElasticsearchServiceStart } from 'src/core/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { UpgradeAssistantTelemetry } from '../../../common/types';
import {
  isDeprecationLogIndexingEnabled,
  isDeprecationLoggingEnabled,
} from '../es_deprecation_logging_apis';

async function getDeprecationLoggingStatusValue(esClient: ElasticsearchClient): Promise<boolean> {
  try {
    const loggerDeprecationCallResult = await esClient.cluster.getSettings({
      include_defaults: true,
    });

    return (
      isDeprecationLogIndexingEnabled(loggerDeprecationCallResult) &&
      isDeprecationLoggingEnabled(loggerDeprecationCallResult)
    );
  } catch (e) {
    return false;
  }
}

export async function fetchUpgradeAssistantMetrics({
  client: esClient,
}: ElasticsearchServiceStart): Promise<UpgradeAssistantTelemetry> {
  const deprecationLoggingStatusValue = await getDeprecationLoggingStatusValue(
    esClient.asInternalUser
  );

  return {
    features: {
      deprecation_logging: {
        enabled: deprecationLoggingStatusValue,
      },
    },
  };
}

interface Dependencies {
  elasticsearch: ElasticsearchServiceStart;
  usageCollection: UsageCollectionSetup;
}

export function registerUpgradeAssistantUsageCollector({
  elasticsearch,
  usageCollection,
}: Dependencies) {
  const upgradeAssistantUsageCollector =
    usageCollection.makeUsageCollector<UpgradeAssistantTelemetry>({
      type: 'upgrade-assistant-telemetry',
      isReady: () => true,
      schema: {
        features: {
          deprecation_logging: {
            enabled: {
              type: 'boolean',
              _meta: {
                description: 'Whether user has enabled Elasticsearch deprecation logging',
              },
            },
          },
        },
      },
      fetch: async () => fetchUpgradeAssistantMetrics(elasticsearch),
    });

  usageCollection.registerCollector(upgradeAssistantUsageCollector);
}
