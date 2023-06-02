/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SyntheticsPrivateLocations } from '../../../../common/runtime_types';
import { SyntheticsRestApiRouteFactory } from '../../../legacy_uptime/routes';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import {
  privateLocationsSavedObjectId,
  privateLocationsSavedObjectName,
} from '../../../../common/saved_objects/private_locations';

export const getPrivateLocationsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.PRIVATE_LOCATIONS,
  validate: {},
  handler: async ({ savedObjectsClient }): Promise<any> => {
    return await getAllPrivateLocations(savedObjectsClient);
  },
});

export const getAllPrivateLocations = async (
  savedObjectsClient: SavedObjectsClientContract
): Promise<SyntheticsPrivateLocations> => {
  try {
    const obj = await savedObjectsClient.get<SyntheticsPrivateLocations>(
      privateLocationsSavedObjectName,
      privateLocationsSavedObjectId
    );
    return obj?.attributes ?? { locations: [] };
  } catch (getErr) {
    return { locations: [] };
  }
};
