/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { SavedObjectsRepository } from 'src/server/saved_objects/service/lib/repository';
import {
  UPGRADE_ASSISTANT_DOC_ID,
  UPGRADE_ASSISTANT_TYPE,
  UpgradeAssistantTelemetry,
  UpgradeAssistantTelemetrySavedObject,
  UpgradeAssistantTelemetrySavedObjectAttributes,
  UpgradeAssistantTelemetryServer,
} from '../../../common/types';
import { isDeprecationLoggingEnabled } from '../es_deprecation_logging_apis';

async function getSavedObjectAttributesFromRepo(
  savedObjectsRepository: SavedObjectsRepository,
  docType: string,
  docID: string
) {
  try {
    return (await savedObjectsRepository.get(docType, docID)).attributes;
  } catch (e) {
    return null;
  }
}

async function getDeprecationLoggingStatusValue(callCluster: any): Promise<boolean> {
  try {
    const loggerDeprecationCallResult = await callCluster('cluster.getSettings', {
      includeDefaults: true,
    });

    return isDeprecationLoggingEnabled(loggerDeprecationCallResult);
  } catch (e) {
    return false;
  }
}

export async function fetchUpgradeAssistantMetrics(
  callCluster: any,
  server: UpgradeAssistantTelemetryServer
): Promise<UpgradeAssistantTelemetry> {
  const { getSavedObjectsRepository } = server.savedObjects;
  const savedObjectsRepository = getSavedObjectsRepository(callCluster);
  const upgradeAssistantSOAttributes = await getSavedObjectAttributesFromRepo(
    savedObjectsRepository,
    UPGRADE_ASSISTANT_TYPE,
    UPGRADE_ASSISTANT_DOC_ID
  );
  const deprecationLoggingStatusValue = await getDeprecationLoggingStatusValue(callCluster);

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

    return {
      ui_open: {
        overview: get(upgradeAssistantTelemetrySavedObjectAttrs, 'ui_open.overview', 0),
        cluster: get(upgradeAssistantTelemetrySavedObjectAttrs, 'ui_open.cluster', 0),
        indices: get(upgradeAssistantTelemetrySavedObjectAttrs, 'ui_open.indices', 0),
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

export function makeUpgradeAssistantUsageCollector(server: UpgradeAssistantTelemetryServer) {
  const kbnServer = server as UpgradeAssistantTelemetryServer;
  const upgradeAssistantUsageCollector = kbnServer.usage.collectorSet.makeUsageCollector({
    type: UPGRADE_ASSISTANT_TYPE,
    isReady: () => true,
    fetch: async (callCluster: any) => fetchUpgradeAssistantMetrics(callCluster, server),
  });

  kbnServer.usage.collectorSet.register(upgradeAssistantUsageCollector);
}
