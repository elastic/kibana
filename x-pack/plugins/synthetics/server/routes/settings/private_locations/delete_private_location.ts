/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { isEmpty } from 'lodash';
import { getMonitorsByLocation } from './get_location_monitors';
import { getPrivateLocationsAndAgentPolicies } from './get_private_locations';
import { SyntheticsRestApiRouteFactory } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import {
  privateLocationsSavedObjectId,
  privateLocationsSavedObjectName,
} from '../../../../common/saved_objects/private_locations';
import type { SyntheticsPrivateLocationsAttributes } from '../../../runtime_types/private_locations';

export const deletePrivateLocationRoute: SyntheticsRestApiRouteFactory<undefined> = () => ({
  method: 'DELETE',
  path: SYNTHETICS_API_URLS.PRIVATE_LOCATIONS + '/{locationId}',
  validate: {},
  validation: {
    request: {
      params: schema.object({
        locationId: schema.string({ minLength: 1, maxLength: 1024 }),
      }),
    },
  },
  handler: async ({ response, savedObjectsClient, syntheticsMonitorClient, request, server }) => {
    const { locationId } = request.params as { locationId: string };

    const { locations } = await getPrivateLocationsAndAgentPolicies(
      savedObjectsClient,
      syntheticsMonitorClient
    );

    if (!locations.find((loc) => loc.id === locationId)) {
      return response.badRequest({
        body: {
          message: `Private location with id ${locationId} does not exist.`,
        },
      });
    }

    const monitors = await getMonitorsByLocation(server, locationId);

    if (!isEmpty(monitors)) {
      const count = monitors.find((monitor) => monitor.id === locationId)?.count;
      return response.badRequest({
        body: {
          message: `Private location with id ${locationId} cannot be deleted because it is used by ${count} monitor(s).`,
        },
      });
    }

    const remainingLocations = locations.filter((loc) => loc.id !== locationId);

    await savedObjectsClient.create<SyntheticsPrivateLocationsAttributes>(
      privateLocationsSavedObjectName,
      { locations: remainingLocations },
      {
        id: privateLocationsSavedObjectId,
        overwrite: true,
      }
    );

    return;
  },
});
