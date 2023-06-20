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
import type { SyntheticsPrivateLocationsAttributes } from '../../../runtime_types/private_locations';
import { toClientContract } from './helpers';

export const getPrivateLocationsRoute: SyntheticsRestApiRouteFactory<
  SyntheticsPrivateLocations
> = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.PRIVATE_LOCATIONS,
  validate: {},
  handler: async ({ savedObjectsClient }) => {
    const attributes = await getAllPrivateLocationsAttributes(savedObjectsClient);
    return toClientContract(attributes);
  },
});

export const getAllPrivateLocationsAttributes = async (
  savedObjectsClient: SavedObjectsClientContract
): Promise<SyntheticsPrivateLocationsAttributes> => {
  try {
    const obj = await savedObjectsClient.get<SyntheticsPrivateLocationsAttributes>(
      privateLocationsSavedObjectName,
      privateLocationsSavedObjectId
    );
    return obj?.attributes ?? { locations: [] };
  } catch (getErr) {
    return { locations: [] };
  }
};
