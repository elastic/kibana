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
} from '@kbn/fleet-plugin/common';
import type { PutAgentReassignResponse } from '@kbn/fleet-plugin/common/types';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { request } from './common';

export const getEndpointIntegrationVersion = (): Cypress.Chainable<string> =>
  request<GetInfoResponse>({
    url: epmRouteService.getInfoPath('endpoint'),
    method: 'GET',
  }).then((response) => response.body.item.version);

export const getAgentByHostName = (hostname: string): Cypress.Chainable<Agent> =>
  request<GetAgentsResponse>({
    url: agentRouteService.getListPath(),
    method: 'GET',
    qs: {
      kuery: `local_metadata.host.hostname: "${hostname}"`,
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
  });

export const yieldEndpointPolicyRevision = (): Cypress.Chainable<number> =>
  request<GetPackagePoliciesResponse>({
    method: 'GET',
    url: packagePolicyRouteService.getListPath(),
    qs: {
      kuery: 'ingest-package-policies.package.name: endpoint',
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
