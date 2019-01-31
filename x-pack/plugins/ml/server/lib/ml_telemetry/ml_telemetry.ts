/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';

export interface MlTelemetry {
  file_data_visualizer_index_creation_count: number;
}

export const ML_TELEMETRY_DOC_ID = 'ml-telemetry';

export function createMlTelemetry(count: number = 0): MlTelemetry {
  return {
    file_data_visualizer_index_creation_count: count,
  };
}

export function storeMlTelemetry(server: Server, mlTelemetry: MlTelemetry): void {
  const savedObjectsClient = getSavedObjectsClient(server);
  savedObjectsClient.create('ml-telemetry', mlTelemetry, {
    id: ML_TELEMETRY_DOC_ID,
    overwrite: true,
  });
}

export function getSavedObjectsClient(server: Server): any {
  const { SavedObjectsClient, getSavedObjectsRepository } = server.savedObjects;
  const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
  const internalRepository = getSavedObjectsRepository(callWithInternalUser);
  return new SavedObjectsClient(internalRepository);
}

export async function incrementFileDataVisualizerIndexCreationCount(server: Server) {
  const savedObjectsClient = getSavedObjectsClient(server);
  const mlTelemetrySavedObject = await savedObjectsClient.get('ml-telemetry', ML_TELEMETRY_DOC_ID);
  const indicesCount =
    mlTelemetrySavedObject.attributes.file_data_visualizer_index_creation_count + 1;

  const mlTelemetry = createMlTelemetry(indicesCount);
  storeMlTelemetry(server, mlTelemetry);
}
