/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentlessApiListDeploymentResponse } from '@kbn/fleet-plugin/common/types';
import { createServer } from '@mswjs/http-middleware';

import { http, HttpResponse } from 'msw';

export const setupMockServer = () => {
  const server = createServer(...deploymentHandler);
  return server;
};

interface AgentlessApiDeploymentResponse {
  code: string;
  error: string | null;
}

const deploymentHandler = [
  http.post(
    'agentless-api/api/v1/ess/deployments',
    async ({ request }): Promise<HttpResponse<AgentlessApiDeploymentResponse>> => {
      return HttpResponse.json({
        code: 'SUCCESS',
        error: null,
      });
    }
  ),
  http.get(
    'agentless-api/api/v1/ess/deployments',
    async ({ request }): Promise<HttpResponse<AgentlessApiListDeploymentResponse>> => {
      return HttpResponse.json({
        deployments: [
          {
            policy_id: 'agentless-deployment-1',
            revision_idx: 1,
          },
          {
            policy_id: 'agentless-deployment-2',
            revision_idx: 1,
          },
        ],
      });
    }
  ),
  http.delete(
    'agentless-api/api/v1/ess/deployments/*',
    async (): Promise<HttpResponse<AgentlessApiDeploymentResponse>> => {
      return HttpResponse.json({
        code: 'SUCCESS',
        error: null,
      });
    }
  ),
];
