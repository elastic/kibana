/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract, SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  privateLocationsSavedObjectId,
  privateLocationsSavedObjectName,
} from '../../common/saved_objects/private_locations';
import type { SyntheticsPrivateLocationsAttributes } from '../runtime_types/private_locations';

export const getPrivateLocations = async (
  client: SavedObjectsClientContract
): Promise<SyntheticsPrivateLocationsAttributes['locations']> => {
  try {
    const obj = await client.get<SyntheticsPrivateLocationsAttributes>(
      privateLocationsSavedObjectName,
      privateLocationsSavedObjectId
    );
    return obj?.attributes.locations ?? [];
  } catch (getErr) {
    if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
      return [];
    }
    throw getErr;
  }
};
