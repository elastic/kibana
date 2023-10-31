/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentPolicyInfo } from '../../../../../common/types';
import { SYNTHETICS_API_URLS } from '../../../../../common/constants';
import { PrivateLocation, SyntheticsPrivateLocations } from '../../../../../common/runtime_types';
import { apiService } from '../../../../utils/api_service/api_service';

export const fetchAgentPolicies = async (): Promise<AgentPolicyInfo[]> => {
  return await apiService.get(SYNTHETICS_API_URLS.AGENT_POLICIES);
};

export const addSyntheticsPrivateLocations = async (
  newLocation: PrivateLocation
): Promise<SyntheticsPrivateLocations> => {
  return await apiService.post(SYNTHETICS_API_URLS.PRIVATE_LOCATIONS, newLocation);
};

export const getSyntheticsPrivateLocations = async (): Promise<SyntheticsPrivateLocations> => {
  return await apiService.get(SYNTHETICS_API_URLS.PRIVATE_LOCATIONS);
};

export const deleteSyntheticsPrivateLocations = async (
  locationId: string
): Promise<SyntheticsPrivateLocations> => {
  return await apiService.delete(SYNTHETICS_API_URLS.PRIVATE_LOCATIONS + `/${locationId}`);
};
