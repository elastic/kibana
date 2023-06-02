/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { getAllPrivateLocations } from './get_private_locations';
import { SyntheticsRestApiRouteFactory } from '../../../legacy_uptime/routes';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import {
  privateLocationsSavedObjectId,
  privateLocationsSavedObjectName,
} from '../../../../common/saved_objects/private_locations';

export const deletePrivateLocationRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'DELETE',
  path: SYNTHETICS_API_URLS.PRIVATE_LOCATIONS + '/{locationId}',
  validate: {
    params: schema.object({
      locationId: schema.string({ minLength: 1, maxLength: 1024 }),
    }),
  },
  writeAccess: true,
  handler: async ({ savedObjectsClient, request, server }): Promise<any> => {
    const { locationId } = request.params as { locationId: string };

    const { locations } = await getAllPrivateLocations(savedObjectsClient);
    const remainingLocations = locations.filter((loc) => loc.id !== locationId);

    const result = await savedObjectsClient.create(
      privateLocationsSavedObjectName,
      { locations: remainingLocations },
      {
        id: privateLocationsSavedObjectId,
        overwrite: true,
      }
    );

    return result.attributes;
  },
});
