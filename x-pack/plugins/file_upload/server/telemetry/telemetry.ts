/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { ISavedObjectsRepository } from '@kbn/core/server';

import { getInternalRepository } from './internal_repository';

export const TELEMETRY_DOC_ID = 'file-upload-usage-collection-telemetry';

export interface Telemetry {
  file_upload: {
    index_creation_count: number;
  };
}

export interface TelemetrySavedObject {
  attributes: Telemetry;
}

export function initTelemetry(): Telemetry {
  return {
    file_upload: {
      index_creation_count: 0,
    },
  };
}

export async function getTelemetry(
  internalRepository?: ISavedObjectsRepository
): Promise<Telemetry | null> {
  if (internalRepository === undefined) {
    return null;
  }

  let telemetrySavedObject;

  try {
    telemetrySavedObject = await internalRepository.get<Telemetry>(
      TELEMETRY_DOC_ID,
      TELEMETRY_DOC_ID
    );
  } catch (e) {
    // Fail silently
  }

  return telemetrySavedObject ? telemetrySavedObject.attributes : null;
}

export async function updateTelemetry(internalRepo?: ISavedObjectsRepository) {
  const internalRepository = internalRepo || getInternalRepository();
  if (internalRepository === null) {
    return;
  }

  let telemetry = await getTelemetry(internalRepository);
  // Create if doesn't exist
  if (telemetry === null || isEmpty(telemetry)) {
    const newTelemetrySavedObject = await internalRepository.create(
      TELEMETRY_DOC_ID,
      initTelemetry(),
      { id: TELEMETRY_DOC_ID }
    );
    telemetry = newTelemetrySavedObject.attributes;
  }

  if (telemetry !== null) {
    await internalRepository.update(TELEMETRY_DOC_ID, TELEMETRY_DOC_ID, incrementCounts(telemetry));
  }
}

function incrementCounts(telemetry: Telemetry) {
  return {
    file_upload: {
      index_creation_count: telemetry.file_upload.index_creation_count + 1,
    },
  };
}
