/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsClientContract,
  SavedObjectsErrorHelpers,
  SavedObjectsType,
} from '@kbn/core/server';
import { privateLocationsSavedObjectName } from '../../../../common/saved_objects/private_locations';
import { PrivateLocation, SyntheticsPrivateLocations } from '../../../../common/runtime_types';
export const privateLocationsSavedObjectId = 'synthetics-privates-locations-singleton';

export const privateLocationsSavedObject: SavedObjectsType = {
  name: privateLocationsSavedObjectName,
  hidden: false,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {
      /* Leaving these commented to make it clear that these fields exist, even though we don't want them indexed.
         When adding new fields please add them here. If they need to be searchable put them in the uncommented
         part of properties.
      */
    },
  },
  management: {
    importableAndExportable: true,
  },
};

export const getSyntheticsPrivateLocations = async (
  client: SavedObjectsClientContract
): Promise<PrivateLocation[]> => {
  try {
    const obj = await client.get<SyntheticsPrivateLocations>(
      privateLocationsSavedObject.name,
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
export const setSyntheticsPrivateLocations = async (
  client: SavedObjectsClientContract,
  privateLocations: SyntheticsPrivateLocations
) => {
  await client.create(privateLocationsSavedObject.name, privateLocations, {
    id: privateLocationsSavedObjectId,
    overwrite: true,
  });
};
