/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObjectAttributes,
  SavedObjectsServiceStart,
  ISavedObjectsRepository,
} from 'src/core/server';

export interface MlTelemetry extends SavedObjectAttributes {
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
// savedObjects
export function storeMlTelemetry(
  internalRepository: ISavedObjectsRepository,
  mlTelemetry: MlTelemetry
): void {
  internalRepository.create('ml-telemetry', mlTelemetry, {
    id: ML_TELEMETRY_DOC_ID,
    overwrite: true,
  });
}

export async function incrementFileDataVisualizerIndexCreationCount(
  savedObjects: SavedObjectsServiceStart
): Promise<void> {
  const internalRepository = await savedObjects.createInternalRepository();
  try {
    const { attributes } = await internalRepository.get('telemetry', 'telemetry');

    if (attributes.enabled === false) {
      return;
    }
  } catch (error) {
    // if we aren't allowed to get the telemetry document,
    // we assume we couldn't opt in to telemetry and won't increment the index count.
    return;
  }

  let indicesCount = 1;

  try {
    const { attributes } = (await internalRepository.get(
      'ml-telemetry',
      ML_TELEMETRY_DOC_ID
    )) as MlTelemetrySavedObject;
    indicesCount = attributes.file_data_visualizer.index_creation_count + 1;
  } catch (e) {
    /* silently fail, this will happen if the saved object doesn't exist yet. */
  }

  const mlTelemetry = createMlTelemetry(indicesCount);
  storeMlTelemetry(internalRepository, mlTelemetry);
}
