/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set } from 'lodash';
import { SavedObjectsClient } from 'src/server/saved_objects/service/saved_objects_client';
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
  savedObjectsRepository: SavedObjectsClient,
  docType: string,
  docID: string
) {
  try {
    return (await savedObjectsRepository.get(docType, docID)).attributes;
  } catch (e) {
    return null;
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
  const loggerDeprecationCallResult = await callCluster('cluster.getSettings', { ignore: [404] });

  const getTelemetrySavedObject = (
    upgradeAssistantTelemetrySavedObjectAttrs: UpgradeAssistantTelemetrySavedObjectAttributes | null
  ): UpgradeAssistantTelemetrySavedObject => {
    const defaultTelemetrySavedObject = {
      ui_open: {
        overview: 0,
        cluster: 0,
        indices: 0,
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
        enabled: isDeprecationLoggingEnabled(loggerDeprecationCallResult),
      },
    },
  };
}

export function makeUpgradeAssistantUsageCollector(server: UpgradeAssistantTelemetryServer) {
  const kbnServer = server as UpgradeAssistantTelemetryServer;
  const upgradeAssistantUsageCollector = kbnServer.usage.collectorSet.makeUsageCollector({
    type: UPGRADE_ASSISTANT_TYPE,
    fetch: async (callCluster: any) => fetchUpgradeAssistantMetrics(callCluster, server),
  });

  kbnServer.usage.collectorSet.register(upgradeAssistantUsageCollector);
}
