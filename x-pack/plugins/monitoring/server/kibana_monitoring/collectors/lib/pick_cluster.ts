/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClient, SavedObject } from 'src/core/server';
import { uniq } from 'lodash';
import { AlertCluster } from '../../../alerts/types';
import { SAVED_OBJECT_TELEMETRY } from '../../../../common/constants';

interface MonitoringTelemetryUsedClusterUuids {
  reportedClusterUuids: string[];
}

const SAVED_OBJECT_ID = 'reportedClusterUuids';

export async function pickCluster(
  clusters: AlertCluster[],
  savedObjectsClient: SavedObjectsClient
): Promise<AlertCluster> {
  let usedClusterUuidsSavedObject: SavedObject<MonitoringTelemetryUsedClusterUuids> | null = null;
  try {
    usedClusterUuidsSavedObject = await savedObjectsClient.get<MonitoringTelemetryUsedClusterUuids>(
      SAVED_OBJECT_TELEMETRY,
      SAVED_OBJECT_ID
    );
  } catch (err) {
    // Swalllow the error
  }

  let cluster = clusters[0];
  if (usedClusterUuidsSavedObject) {
    const unusedCluster = clusters.find(
      (_cluster) =>
        !usedClusterUuidsSavedObject?.attributes.reportedClusterUuids.includes(_cluster.clusterUuid)
    );
    if (unusedCluster) {
      cluster = unusedCluster;
      await savedObjectsClient.update(SAVED_OBJECT_TELEMETRY, SAVED_OBJECT_ID, {
        reportedClusterUuids: uniq([
          ...usedClusterUuidsSavedObject.attributes.reportedClusterUuids,
          cluster.clusterUuid,
        ]),
      });
    } else {
      await savedObjectsClient.delete(SAVED_OBJECT_TELEMETRY, SAVED_OBJECT_ID);
    }
  } else {
    await savedObjectsClient.create(
      SAVED_OBJECT_TELEMETRY,
      {
        reportedClusterUuids: [cluster.clusterUuid],
      },
      { id: SAVED_OBJECT_ID }
    );
  }

  return cluster;
}
