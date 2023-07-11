/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { AxiosResponse } from 'axios';
import type {
  AgentPolicy,
  CreateAgentPolicyRequest,
  CreateAgentPolicyResponse,
  CreatePackagePolicyRequest,
  CreatePackagePolicyResponse,
  DeleteAgentPolicyResponse,
  PostDeletePackagePoliciesResponse,
} from '@kbn/fleet-plugin/common';
import { kibanaPackageJson } from '@kbn/repo-info';
import { AGENT_POLICY_API_ROUTES, PACKAGE_POLICY_API_ROUTES } from '@kbn/fleet-plugin/common';
import type { PolicyData } from '../types';
import { policyFactory as policyConfigFactory } from '../models/policy_config';
import { wrapErrorAndRejectPromise } from './utils';

export interface IndexedFleetEndpointPolicyResponse {
  integrationPolicies: PolicyData[];
  agentPolicies: AgentPolicy[];
}

/**
 * Create an endpoint Integration Policy (and associated Agent Policy) via Fleet
 * (NOTE: ensure that fleet is setup first before calling this loading function)
 */
export const indexFleetEndpointPolicy = async (
  kbnClient: KbnClient,
  policyName: string,
  endpointPackageVersion: string = kibanaPackageJson.version,
  agentPolicyName?: string
): Promise<IndexedFleetEndpointPolicyResponse> => {
  const response: IndexedFleetEndpointPolicyResponse = {
    integrationPolicies: [],
    agentPolicies: [],
  };

  // Create Agent Policy first
  const newAgentPolicyData: CreateAgentPolicyRequest['body'] = {
    name:
      agentPolicyName || `Policy for ${policyName} (${Math.random().toString(36).substr(2, 5)})`,
    description: `Policy created with endpoint data generator (${policyName})`,
    namespace: 'default',
    monitoring_enabled: ['logs', 'metrics'],
  };

  let agentPolicy: AxiosResponse<CreateAgentPolicyResponse>;

  try {
    agentPolicy = (await kbnClient
      .request({
        path: AGENT_POLICY_API_ROUTES.CREATE_PATTERN,
        method: 'POST',
        body: newAgentPolicyData,
      })
      .catch(wrapErrorAndRejectPromise)) as AxiosResponse<CreateAgentPolicyResponse>;
  } catch (error) {
    throw new Error(`create fleet agent policy failed ${error}`);
  }

  response.agentPolicies.push(agentPolicy.data.item);

  // Create integration (package) policy
  const newPackagePolicyData: CreatePackagePolicyRequest['body'] = {
    name: policyName,
    description: 'Protect the worlds data',
    policy_id: agentPolicy.data.item.id,
    enabled: true,
    inputs: [
      {
        type: 'endpoint',
        enabled: true,
        streams: [],
        config: {
          policy: {
            value: policyConfigFactory(),
          },
        },
      },
    ],
    namespace: 'default',
    package: {
      name: 'endpoint',
      title: 'Elastic Defend',
      version: endpointPackageVersion,
    },
  };
  const packagePolicy = (await kbnClient
    .request({
      path: PACKAGE_POLICY_API_ROUTES.CREATE_PATTERN,
      method: 'POST',
      body: newPackagePolicyData,
    })
    .catch(wrapErrorAndRejectPromise)) as AxiosResponse<CreatePackagePolicyResponse>;

  response.integrationPolicies.push(packagePolicy.data.item as PolicyData);

  return response;
};

export interface DeleteIndexedFleetEndpointPoliciesResponse {
  integrationPolicies: PostDeletePackagePoliciesResponse | undefined;
  agentPolicies: DeleteAgentPolicyResponse[] | undefined;
}

/**
 * Delete indexed Fleet Endpoint integration policies along with their respective Agent Policies.
 * Prior to calling this function, ensure that no agents are associated with the Agent Policy.
 * (NOTE: ensure that fleet is setup first before calling this loading function)
 * @param kbnClient
 * @param indexData
 */
export const deleteIndexedFleetEndpointPolicies = async (
  kbnClient: KbnClient,
  indexData: IndexedFleetEndpointPolicyResponse
): Promise<DeleteIndexedFleetEndpointPoliciesResponse> => {
  const response: DeleteIndexedFleetEndpointPoliciesResponse = {
    integrationPolicies: undefined,
    agentPolicies: undefined,
  };

  if (indexData.integrationPolicies.length) {
    response.integrationPolicies = (
      (await kbnClient
        .request({
          path: PACKAGE_POLICY_API_ROUTES.DELETE_PATTERN,
          method: 'POST',
          body: {
            packagePolicyIds: indexData.integrationPolicies.map((policy) => policy.id),
          },
        })
        .catch(wrapErrorAndRejectPromise)) as AxiosResponse<PostDeletePackagePoliciesResponse>
    ).data;
  }

  if (indexData.agentPolicies.length) {
    response.agentPolicies = [];

    for (const agentPolicy of indexData.agentPolicies) {
      response.agentPolicies.push(
        (
          (await kbnClient
            .request({
              path: AGENT_POLICY_API_ROUTES.DELETE_PATTERN,
              method: 'POST',
              body: {
                agentPolicyId: agentPolicy.id,
              },
            })
            .catch(wrapErrorAndRejectPromise)) as AxiosResponse<DeleteAgentPolicyResponse>
        ).data
      );
    }
  }

  return response;
};
