/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS, agentPolicyRouteService, agentRouteService } from '@kbn/fleet-plugin/common';
import { uninstallTokensRouteService } from '@kbn/fleet-plugin/common/services/routes';
import type { GetUninstallTokensMetadataResponse } from '@kbn/fleet-plugin/common/types/rest_spec/uninstall_token';
import type { UninstallToken } from '@kbn/fleet-plugin/common/types/models/uninstall_token';
import { request } from './common';

export const enableAgentTamperProtectionFeatureFlagInPolicy = (agentPolicyId: string) => {
  return request({
    method: 'PUT',
    url: agentPolicyRouteService.getUpdatePath(agentPolicyId),
    body: {
      name: 'With agent tamper protection enabled',
      agent_features: [{ name: 'tamper_protection', enabled: true }], // TODO: this can be removed once FF code is removed
      is_protected: true,
      description: 'test',
      namespace: 'default',
      monitoring_enabled: ['logs', 'metrics'],
      inactivity_timeout: 1209600,
    },
    headers: { 'Elastic-Api-Version': API_VERSIONS.public.v1 },
  });
};

export const getUninstallToken = (agentPolicyId: string) => {
  return request<GetUninstallTokensMetadataResponse>({
    method: 'GET',
    url: `${uninstallTokensRouteService.getListPath()}?policyId=${agentPolicyId}`,
    headers: { 'Elastic-Api-Version': API_VERSIONS.public.v1 },
  });
};

export const getUninstallTokenValue = (uninstallTokenId: string) => {
  return request<{ item: UninstallToken }>({
    method: 'GET',
    url: uninstallTokensRouteService.getInfoPath(uninstallTokenId),
    headers: { 'Elastic-Api-Version': API_VERSIONS.public.v1 },
  });
};

export const unenrollAgent = (agentId: string) => {
  return request({
    method: 'POST',
    url: agentRouteService.getUnenrollPath(agentId),
    headers: { 'Elastic-Api-Version': API_VERSIONS.public.v1 },
  });
};

export const ensureAgentIsUnenrolled = (agentId: string): Cypress.Chainable<string> => {
  return cy.task(
    'ensureAgentHasBeenUnenrolled',
    {
      agentId,
    },
    { timeout: 600000 }
  );
};
