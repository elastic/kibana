/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/public';
import { SyntheticsPrivateLocations } from '../../../../../common/runtime_types';
import { apiService } from '../../../../utils/api_service/api_service';
import { AgentPoliciesList } from '.';
import {
  privateLocationsSavedObjectId,
  privateLocationsSavedObjectName,
} from '../../../../../common/saved_objects/private_locations';

const FLEET_URLS = {
  AGENT_POLICIES: '/api/fleet/agent_policies',
};

export const fetchAgentPolicies = async (): Promise<AgentPoliciesList> => {
  return await apiService.get(
    FLEET_URLS.AGENT_POLICIES,
    {
      page: 1,
      perPage: 10000,
      sortField: 'name',
      sortOrder: 'asc',
      full: true,
      kuery: 'ingest-agent-policies.is_managed : false',
    },
    null
  );
};

export const setSyntheticsPrivateLocations = async (
  client: SavedObjectsClientContract,
  privateLocations: SyntheticsPrivateLocations
) => {
  const result = await client.create(privateLocationsSavedObjectName, privateLocations, {
    id: privateLocationsSavedObjectId,
    overwrite: true,
  });

  return result.attributes;
};

export const getSyntheticsPrivateLocations = async (client: SavedObjectsClientContract) => {
  try {
    const obj = await client.get<SyntheticsPrivateLocations>(
      privateLocationsSavedObjectName,
      privateLocationsSavedObjectId
    );
    return obj?.attributes.locations ?? [];
  } catch (getErr) {
    return [];
  }
};
