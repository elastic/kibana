/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';

export interface MlTelemetry {
  file_data_visualizer_indices_count: number;
}

export const ML_TELEMETRY_DOC_ID = 'ml-telemetry';

export function createMlTelementry(count: number = 0): MlTelemetry {
  return {
    file_data_visualizer_indices_count: count,
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
