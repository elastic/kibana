/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';

import { callWithInternalUserFactory } from '../../client/call_with_internal_user_factory';

export interface MlTelemetry {
  file_data_visualizer: {
    index_creation_count: number;
  };
}

export interface MlTelemetrySavedObject {
  attributes: MlTelemetry;
}

export const ML_TELEMETRY_DOC_ID = 'ml-telemetry';

export function createMlTelemetry(count: number = 0): MlTelemetry {
  return {
    file_data_visualizer: {
      index_creation_count: count,
    },
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
  const callWithInternalUser = callWithInternalUserFactory(server);
  const internalRepository = getSavedObjectsRepository(callWithInternalUser);
  return new SavedObjectsClient(internalRepository);
}

export async function incrementFileDataVisualizerIndexCreationCount(server: Server) {
  let indicesCount = 0;

  try {
    const savedObjectsClient = getSavedObjectsClient(server);
    const mlTelemetrySavedObject = (await savedObjectsClient.get(
      'ml-telemetry',
      ML_TELEMETRY_DOC_ID
    )) as MlTelemetrySavedObject;
    indicesCount = mlTelemetrySavedObject.attributes.file_data_visualizer.index_creation_count + 1;
  } catch (e) {
    /* silently fail on telemetry error */
  }

  const mlTelemetry = createMlTelemetry(indicesCount);
  storeMlTelemetry(server, mlTelemetry);
}
