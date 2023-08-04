/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SyntheticsRestApiRouteFactory } from '../../types';
import { getPrivateLocationsAndAgentPolicies } from './get_private_locations';
import {
  privateLocationsSavedObjectId,
  privateLocationsSavedObjectName,
} from '../../../../common/saved_objects/private_locations';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';
import type { PrivateLocation, SyntheticsPrivateLocations } from '../../../../common/runtime_types';
import type { SyntheticsPrivateLocationsAttributes } from '../../../runtime_types/private_locations';
import { toClientContract, toSavedObjectContract } from './helpers';

export const PrivateLocationSchema = schema.object({
  label: schema.string(),
  id: schema.string(),
  agentPolicyId: schema.string(),
  concurrentMonitors: schema.number(),
  tags: schema.maybe(schema.arrayOf(schema.string())),
  geo: schema.maybe(
    schema.object({
      lat: schema.number(),
      lon: schema.number(),
    })
  ),
});

export const addPrivateLocationRoute: SyntheticsRestApiRouteFactory<
  SyntheticsPrivateLocations
> = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.PRIVATE_LOCATIONS,
  validate: {
    body: PrivateLocationSchema,
  },
  writeAccess: true,
  handler: async ({ request, savedObjectsClient, syntheticsMonitorClient }) => {
    const location = request.body as PrivateLocation;

    const { locations, agentPolicies } = await getPrivateLocationsAndAgentPolicies(
      savedObjectsClient,
      syntheticsMonitorClient
    );

    const existingLocations = locations.filter((loc) => loc.id !== location.agentPolicyId);
    const formattedLocation = toSavedObjectContract(location);

    const result = await savedObjectsClient.create<SyntheticsPrivateLocationsAttributes>(
      privateLocationsSavedObjectName,
      { locations: [...existingLocations, formattedLocation] },
      {
        id: privateLocationsSavedObjectId,
        overwrite: true,
      }
    );

    return toClientContract(result.attributes, agentPolicies);
  },
});
