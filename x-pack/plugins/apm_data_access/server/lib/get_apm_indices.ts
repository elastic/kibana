/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import type { APMDataAccessConfig, APMIndices } from '..';
import { getApmIndicesSavedObject } from '../saved_objects/apm_indices';

export async function getApmIndicesFromSavedObjectsAndConfigFile({
  apmIndicesFromConfigFile,
  savedObjectsClient,
}: {
  apmIndicesFromConfigFile: APMDataAccessConfig['indices'];
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<APMIndices> {
  try {
    const apmIndicesSavedObject = await getApmIndicesSavedObject(savedObjectsClient);
    return { ...apmIndicesFromConfigFile, ...apmIndicesSavedObject };
  } catch (error) {
    return apmIndicesFromConfigFile;
  }
}
