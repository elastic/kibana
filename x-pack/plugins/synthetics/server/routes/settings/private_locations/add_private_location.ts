/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { getAllPrivateLocations } from './get_private_locations';
import {
  privateLocationsSavedObjectId,
  privateLocationsSavedObjectName,
} from '../../../../common/saved_objects/private_locations';
import { SyntheticsRestApiRouteFactory } from '../../../legacy_uptime/routes';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import { PrivateLocation } from '../../../../common/runtime_types';

export const PrivateLocationSchema = schema.object({
  label: schema.string(),
  id: schema.string(),
  agentPolicyId: schema.string(),
  concurrentMonitors: schema.number(),
  tags: schema.maybe(schema.arrayOf(schema.string())),
  geo: schema.maybe(
    schema.object({
      lat: schema.oneOf([schema.number(), schema.string()]),
      lon: schema.oneOf([schema.number(), schema.string()]),
    })
  ),
});

export const addPrivateLocationRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.PRIVATE_LOCATIONS,
  validate: {
    body: PrivateLocationSchema,
  },
  writeAccess: true,
  handler: async ({ request, server, savedObjectsClient }): Promise<any> => {
    const location = request.body as PrivateLocation;

    const { locations } = await getAllPrivateLocations(savedObjectsClient);
    const existingLocations = locations.filter((loc) => loc.id !== location.agentPolicyId);

    const result = await savedObjectsClient.create(
      privateLocationsSavedObjectName,
      { locations: [...existingLocations, location] },
      {
        id: privateLocationsSavedObjectId,
        overwrite: true,
      }
    );

    return result.attributes;
  },
});
