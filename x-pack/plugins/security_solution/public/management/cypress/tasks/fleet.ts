/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentPolicy, GetAgentsResponse, UpdatePackagePolicy } from '@kbn/fleet-plugin/common';
import {
  agentRouteService,
  agentPolicyRouteService,
  packagePolicyRouteService,
} from '@kbn/fleet-plugin/common';
import { request } from './common';

export const getAgentByHostName = (hostname: string) => {
  return request<GetAgentsResponse>({
    url: agentRouteService.getListPath(),
    method: 'GET',
    qs: {
      kuery: `local_metadata.host.hostname: "${hostname}"`,
    },
  }).then((response) => response.body.items[0]);
};

export const updatePackagePolicy = (packagePolicyId: string, packagePolicy: UpdatePackagePolicy) =>
  request({
    url: packagePolicyRouteService.getUpdatePath(packagePolicyId),
    method: 'PUT',
    body: packagePolicy,
  });

export const updateAgentPolicy = (agentPolicyId: string, agentPolicy: AgentPolicy) =>
  request({
    url: agentPolicyRouteService.getUpdatePath(agentPolicyId),
    method: 'PUT',
    body: agentPolicy,
  });

export const reassignAgentPolicy = (agentId: string, agentPolicyId: string) =>
  request({
    url: agentRouteService.getReassignPath(agentId),
    method: 'PUT',
    body: {
      policy_id: agentPolicyId,
    },
  });
