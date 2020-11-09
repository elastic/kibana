/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ISavedObjectsRepository,
  SavedObjectsServiceStart,
  SavedObjectAttributes,
  Logger,
} from 'src/core/server';

// This throws `Error: Cannot find module 'src/core/server'` if I import it via alias ¯\_(ツ)_/¯
import { SavedObjectsErrorHelpers } from '../../../../../../src/core/server';

/**
 * Fetches saved objects attributes - used by collectors
 */

export const getSavedObjectAttributesFromRepo = async (
  id: string, // Telemetry name
  savedObjectsRepository: ISavedObjectsRepository,
  log: Logger
): Promise<SavedObjectAttributes | null> => {
  try {
    return (await savedObjectsRepository.get(id, id)).attributes as SavedObjectAttributes;
  } catch (e) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(e)) {
      log.warn(`Failed to retrieve ${id} telemetry data: ${e}`);
    }
    return null;
  }
};

/**
 * Set saved objection attributes - used by telemetry route
 */

interface IIncrementUICounter {
  id: string; // Telemetry name
  savedObjects: SavedObjectsServiceStart;
  uiAction: string;
  metric: string;
}

export async function incrementUICounter({
  id,
  savedObjects,
  uiAction,
  metric,
}: IIncrementUICounter) {
  const internalRepository = savedObjects.createInternalRepository();

  await internalRepository.incrementCounter(
    id,
    id,
    `${uiAction}.${metric}` // e.g., ui_viewed.setup_guide
  );

  return { success: true };
}
