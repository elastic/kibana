/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set } from 'lodash';
import {
  APICaller,
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

async function getDeprecationLoggingStatusValue(callAsCurrentUser: APICaller): Promise<boolean> {
  try {
    const loggerDeprecationCallResult = await callAsCurrentUser('cluster.getSettings', {
      includeDefaults: true,
    });

    return isDeprecationLoggingEnabled(loggerDeprecationCallResult);
  } catch (e) {
    return false;
  }
}

export async function fetchUpgradeAssistantMetrics(
  { legacy: { client: esClient } }: ElasticsearchServiceStart,
  savedObjects: SavedObjectsServiceStart
): Promise<UpgradeAssistantTelemetry> {
  const savedObjectsRepository = savedObjects.createInternalRepository();
  const upgradeAssistantSOAttributes = await getSavedObjectAttributesFromRepo(
    savedObjectsRepository,
    UPGRADE_ASSISTANT_TYPE,
    UPGRADE_ASSISTANT_DOC_ID
  );
  const callAsInternalUser = esClient.callAsInternalUser.bind(esClient);
  const deprecationLoggingStatusValue = await getDeprecationLoggingStatusValue(callAsInternalUser);

  const getTelemetrySavedObject = (
    upgradeAssistantTelemetrySavedObjectAttrs: UpgradeAssistantTelemetrySavedObjectAttributes | null
  ): UpgradeAssistantTelemetrySavedObject => {
    const defaultTelemetrySavedObject = {
      ui_open: {
        overview: 0,
        cluster: 0,
        indices: 0,
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

    const upgradeAssistantTelemetrySOAttrsKeys = Object.keys(
      upgradeAssistantTelemetrySavedObjectAttrs
    );
    const telemetryObj = defaultTelemetrySavedObject;

    upgradeAssistantTelemetrySOAttrsKeys.forEach((key: string) => {
      set(telemetryObj, key, upgradeAssistantTelemetrySavedObjectAttrs[key]);
    });

    return telemetryObj as UpgradeAssistantTelemetrySavedObject;
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
  const upgradeAssistantUsageCollector = usageCollection.makeUsageCollector({
    type: UPGRADE_ASSISTANT_TYPE,
    isReady: () => true,
    fetch: async () => fetchUpgradeAssistantMetrics(elasticsearch, savedObjects),
  });

  usageCollection.registerCollector(upgradeAssistantUsageCollector);
}
