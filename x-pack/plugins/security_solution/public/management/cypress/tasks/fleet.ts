/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Agent,
  GetAgentsResponse,
  GetInfoResponse,
  GetPackagePoliciesResponse,
} from '@kbn/fleet-plugin/common';
import {
  agentRouteService,
  epmRouteService,
  packagePolicyRouteService,
  API_VERSIONS,
  agentPolicyRouteService,
} from '@kbn/fleet-plugin/common';
import type {
  GetOneAgentResponse,
  PutAgentReassignResponse,
  UpdateAgentPolicyResponse,
} from '@kbn/fleet-plugin/common/types';
import { uninstallTokensRouteService } from '@kbn/fleet-plugin/common/services/routes';
import type { GetUninstallTokensMetadataResponse } from '@kbn/fleet-plugin/common/types/rest_spec/uninstall_token';
import type { UninstallToken } from '@kbn/fleet-plugin/common/types/models/uninstall_token';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { request } from './common';

export const getEndpointIntegrationVersion = (): Cypress.Chainable<string> =>
  request<GetInfoResponse>({
    url: epmRouteService.getInfoPath('endpoint'),
    method: 'GET',
    headers: {
      'elastic-api-version': API_VERSIONS.public.v1,
    },
  }).then((response) => response.body.item.version);

export const getAgentByHostName = (hostname: string): Cypress.Chainable<Agent> =>
  request<GetAgentsResponse>({
    url: agentRouteService.getListPath(),
    method: 'GET',
    qs: {
      kuery: `local_metadata.host.hostname: "${hostname}"`,
    },
    headers: {
      'elastic-api-version': API_VERSIONS.public.v1,
    },
  }).then((response) => response.body.items[0]);

export const reassignAgentPolicy = (
  agentId: string,
  agentPolicyId: string
): Cypress.Chainable<Cypress.Response<PutAgentReassignResponse>> =>
  request<PutAgentReassignResponse>({
    url: agentRouteService.getReassignPath(agentId),
    method: 'PUT',
    body: {
      policy_id: agentPolicyId,
    },
    headers: {
      'elastic-api-version': API_VERSIONS.public.v1,
    },
  });

export const yieldEndpointPolicyRevision = (): Cypress.Chainable<number> =>
  request<GetPackagePoliciesResponse>({
    method: 'GET',
    url: packagePolicyRouteService.getListPath(),
    qs: {
      kuery: 'ingest-package-policies.package.name: endpoint',
    },
    headers: {
      'elastic-api-version': API_VERSIONS.public.v1,
    },
  }).then(({ body }) => {
    return body.items?.[0]?.revision ?? -1;
  });

export const createAgentPolicyTask = (
  version: string,
  policyPrefix?: string
): Cypress.Chainable<IndexedFleetEndpointPolicyResponse> => {
  const policyName = `${policyPrefix || 'Reassign'} ${Math.random().toString(36).substring(2, 7)}`;

  return cy.task<IndexedFleetEndpointPolicyResponse>('indexFleetEndpointPolicy', {
    policyName,
    endpointPackageVersion: version,
    agentPolicyName: policyName,
  });
};

export const enableAgentTamperProtectionFeatureFlagInPolicy = (agentPolicyId: string) => {
  return request<UpdateAgentPolicyResponse>({
    method: 'PUT',
    url: agentPolicyRouteService.getUpdatePath(agentPolicyId),
    body: {
      name: `With agent tamper protection enabled ${Math.random().toString(36).substring(2, 7)}`,
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
  }).then((uninstallTokenResponse) => {
    return request<{ item: UninstallToken }>({
      method: 'GET',
      url: uninstallTokensRouteService.getInfoPath(uninstallTokenResponse.body.items[0].id),
      headers: { 'Elastic-Api-Version': API_VERSIONS.public.v1 },
    });
  });
};

export const unenrollAgent = (agentId: string): Cypress.Chainable<boolean> => {
  return request({
    method: 'POST',
    url: agentRouteService.getUnenrollPath(agentId),
    headers: { 'Elastic-Api-Version': API_VERSIONS.public.v1 },
  }).then(() => {
    return waitForIsAgentUnenrolled(agentId);
  });
};

export const changeAgentPolicy = (
  agentId: string,
  policyId: string,
  policyRevision: number
): Cypress.Chainable<boolean> => {
  return request({
    method: 'POST',
    url: agentRouteService.getReassignPath(agentId),
    body: {
      policy_id: policyId,
    },
    headers: { 'Elastic-Api-Version': API_VERSIONS.public.v1 },
  }).then(() => {
    return waitForHasAgentPolicyChanged(agentId, policyId, policyRevision);
  });
};

// only used in "real" endpoint tests not in mocked ones
export const uninstallAgentFromHost = (
  hostname: string,
  uninstallToken?: string
): Cypress.Chainable<string> => {
  return cy.task('uninstallAgentFromHost', {
    hostname,
    uninstallToken,
  });
};

// only used in "real" endpoint tests not in mocked ones
export const isAgentAndEndpointUninstalledFromHost = (
  hostname: string
): Cypress.Chainable<boolean> => {
  return cy.task('isAgentAndEndpointUninstalledFromHost', {
    hostname,
  });
};

const waitForIsAgentUnenrolled = (agentId: string): Cypress.Chainable<boolean> => {
  let isUnenrolled = false;
  return cy
    .waitUntil(
      () => {
        return request<GetOneAgentResponse>({
          method: 'GET',
          url: agentRouteService.getInfoPath(agentId),
          headers: {
            'elastic-api-version': API_VERSIONS.public.v1,
          },
        }).then((response) => {
          if (response.body.item.status === 'unenrolled' && !response.body.item.active) {
            isUnenrolled = true;
            return true;
          }

          return false;
        });
      },
      { timeout: 120000 }
    )
    .then(() => {
      return isUnenrolled;
    });
};

const waitForHasAgentPolicyChanged = (
  agentId: string,
  policyId: string,
  policyRevision: number
): Cypress.Chainable<boolean> => {
  let isPolicyUpdated = false;
  return cy
    .waitUntil(
      () => {
        return request<GetOneAgentResponse>({
          method: 'GET',
          url: agentRouteService.getInfoPath(agentId),
          headers: {
            'elastic-api-version': API_VERSIONS.public.v1,
          },
        }).then((response) => {
          if (
            response.body.item.status !== 'updating' &&
            response.body.item?.policy_revision === policyRevision &&
            response.body.item?.policy_id === policyId
          ) {
            isPolicyUpdated = true;
            return true;
          }

          return false;
        });
      },
      { timeout: 120000 }
    )
    .then(() => {
      return isPolicyUpdated;
    });
};
