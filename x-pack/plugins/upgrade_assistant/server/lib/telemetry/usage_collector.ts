/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import {
  ElasticsearchClient,
  ElasticsearchServiceStart,
  ISavedObjectsRepository,
  SavedObjectsServiceStart,
} from 'src/core/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import {
  UPGRADE_ASSISTANT_DOC_ID,
  UPGRADE_ASSISTANT_TYPE,
  UpgradeAssistantTelemetry,
  UpgradeAssistantTelemetrySavedObject,
  UpgradeAssistantTelemetrySavedObjectAttributes,
} from '../../../common/types';
import { isDeprecationLoggingEnabled } from '../es_deprecation_logging_apis';

async function getSavedObjectAttributesFromRepo(
  savedObjectsRepository: ISavedObjectsRepository,
  docType: string,
  docID: string
) {
  try {
    return (
      await savedObjectsRepository.get<UpgradeAssistantTelemetrySavedObjectAttributes>(
        docType,
        docID
      )
    ).attributes;
  } catch (e) {
    return null;
  }
}

async function getDeprecationLoggingStatusValue(esClient: ElasticsearchClient): Promise<boolean> {
  try {
    const { body: loggerDeprecationCallResult } = await esClient.cluster.getSettings({
      include_defaults: true,
    });

    return isDeprecationLoggingEnabled(loggerDeprecationCallResult);
  } catch (e) {
    return false;
  }
}

export async function fetchUpgradeAssistantMetrics(
  { client: esClient }: ElasticsearchServiceStart,
  savedObjects: SavedObjectsServiceStart
): Promise<UpgradeAssistantTelemetry> {
  const savedObjectsRepository = savedObjects.createInternalRepository();
  const upgradeAssistantSOAttributes = await getSavedObjectAttributesFromRepo(
    savedObjectsRepository,
    UPGRADE_ASSISTANT_TYPE,
    UPGRADE_ASSISTANT_DOC_ID
  );
  const deprecationLoggingStatusValue = await getDeprecationLoggingStatusValue(
    esClient.asInternalUser
  );

  const getTelemetrySavedObject = (
    upgradeAssistantTelemetrySavedObjectAttrs: UpgradeAssistantTelemetrySavedObjectAttributes | null
  ): UpgradeAssistantTelemetrySavedObject => {
    const defaultTelemetrySavedObject = {
      ui_open: {
        overview: 0,
        cluster: 0,
        indices: 0,
        kibana: 0,
      },
      ui_reindex: {
        close: 0,
        open: 0,
        start: 0,
        stop: 0,
      },
    };

    if (!upgradeAssistantTelemetrySavedObjectAttrs) {
      return defaultTelemetrySavedObject;
    }

    return {
      ui_open: {
        overview: get(upgradeAssistantTelemetrySavedObjectAttrs, 'ui_open.overview', 0),
        cluster: get(upgradeAssistantTelemetrySavedObjectAttrs, 'ui_open.cluster', 0),
        indices: get(upgradeAssistantTelemetrySavedObjectAttrs, 'ui_open.indices', 0),
        kibana: get(upgradeAssistantTelemetrySavedObjectAttrs, 'ui_open.kibana', 0),
      },
      ui_reindex: {
        close: get(upgradeAssistantTelemetrySavedObjectAttrs, 'ui_reindex.close', 0),
        open: get(upgradeAssistantTelemetrySavedObjectAttrs, 'ui_reindex.open', 0),
        start: get(upgradeAssistantTelemetrySavedObjectAttrs, 'ui_reindex.start', 0),
        stop: get(upgradeAssistantTelemetrySavedObjectAttrs, 'ui_reindex.stop', 0),
      },
    } as UpgradeAssistantTelemetrySavedObject;
  };

  return {
    ...getTelemetrySavedObject(upgradeAssistantSOAttributes),
    features: {
      deprecation_logging: {
        enabled: deprecationLoggingStatusValue,
      },
    },
  };
}

interface Dependencies {
  elasticsearch: ElasticsearchServiceStart;
  savedObjects: SavedObjectsServiceStart;
  usageCollection: UsageCollectionSetup;
}

export function registerUpgradeAssistantUsageCollector({
  elasticsearch,
  usageCollection,
  savedObjects,
}: Dependencies) {
  const upgradeAssistantUsageCollector = usageCollection.makeUsageCollector<UpgradeAssistantTelemetry>(
    {
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
        ui_open: {
          cluster: {
            type: 'long',
            _meta: {
              description:
                'Number of times a user viewed the list of Elasticsearch cluster deprecations.',
            },
          },
          indices: {
            type: 'long',
            _meta: {
              description:
                'Number of times a user viewed the list of Elasticsearch index deprecations.',
            },
          },
          overview: {
            type: 'long',
            _meta: {
              description: 'Number of times a user viewed the Overview page.',
            },
          },
          kibana: {
            type: 'long',
            _meta: {
              description: 'Number of times a user viewed the list of Kibana deprecations',
            },
          },
        },
        ui_reindex: {
          close: { type: 'long' },
          open: { type: 'long' },
          start: { type: 'long' },
          stop: { type: 'long' },
        },
      },
      fetch: async () => fetchUpgradeAssistantMetrics(elasticsearch, savedObjects),
    }
  );

  usageCollection.registerCollector(upgradeAssistantUsageCollector);
}
