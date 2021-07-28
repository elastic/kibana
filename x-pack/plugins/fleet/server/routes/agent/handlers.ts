/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from 'src/core/server';
import type { TypeOf } from '@kbn/config-schema';

import type {
  GetAgentsResponse,
  GetOneAgentResponse,
  GetAgentStatusResponse,
  PutAgentReassignResponse,
  PostBulkAgentReassignResponse,
} from '../../../common/types';
import type {
  GetAgentsRequestSchema,
  GetOneAgentRequestSchema,
  UpdateAgentRequestSchema,
  DeleteAgentRequestSchema,
  GetAgentStatusRequestSchema,
  PutAgentReassignRequestSchema,
  PostBulkAgentReassignRequestSchema,
} from '../../types';
import { defaultIngestErrorHandler } from '../../errors';
import { licenseService } from '../../services';
import * as AgentService from '../../services/agents';

export const getAgentHandler: RequestHandler<
  TypeOf<typeof GetOneAgentRequestSchema.params>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const esClient = context.core.elasticsearch.client.asCurrentUser;

  try {
    const agent = await AgentService.getAgentById(esClient, request.params.agentId);
    const body: GetOneAgentResponse = {
      item: {
        ...agent,
        status: AgentService.getAgentStatus(agent),
      },
    };

    return response.ok({ body });
  } catch (error) {
    if (soClient.errors.isNotFoundError(error)) {
      return response.notFound({
        body: { message: `Agent ${request.params.agentId} not found` },
      });
    }

    return defaultIngestErrorHandler({ error, response });
  }
};

export const deleteAgentHandler: RequestHandler<
  TypeOf<typeof DeleteAgentRequestSchema.params>
> = async (context, request, response) => {
  const esClient = context.core.elasticsearch.client.asCurrentUser;

  try {
    await AgentService.deleteAgent(esClient, request.params.agentId);

    const body = {
      action: 'deleted',
    };

    return response.ok({ body });
  } catch (error) {
    if (error.isBoom) {
      return response.customError({
        statusCode: error.output.statusCode,
        body: { message: `Agent ${request.params.agentId} not found` },
      });
    }

    return defaultIngestErrorHandler({ error, response });
  }
};

export const updateAgentHandler: RequestHandler<
  TypeOf<typeof UpdateAgentRequestSchema.params>,
  undefined,
  TypeOf<typeof UpdateAgentRequestSchema.body>
> = async (context, request, response) => {
  const esClient = context.core.elasticsearch.client.asCurrentUser;

  try {
    await AgentService.updateAgent(esClient, request.params.agentId, {
      user_provided_metadata: request.body.user_provided_metadata,
    });
    const agent = await AgentService.getAgentById(esClient, request.params.agentId);
    const body = {
      item: {
        ...agent,
        status: AgentService.getAgentStatus(agent),
      },
    };

    return response.ok({ body });
  } catch (error) {
    if (error.isBoom && error.output.statusCode === 404) {
      return response.notFound({
        body: { message: `Agent ${request.params.agentId} not found` },
      });
    }

    return defaultIngestErrorHandler({ error, response });
  }
};

export const getAgentsHandler: RequestHandler<
  undefined,
  TypeOf<typeof GetAgentsRequestSchema.query>
> = async (context, request, response) => {
  const esClient = context.core.elasticsearch.client.asCurrentUser;

  try {
    const { agents, total, page, perPage } = await AgentService.getAgentsByKuery(esClient, {
      page: request.query.page,
      perPage: request.query.perPage,
      showInactive: request.query.showInactive,
      showUpgradeable: request.query.showUpgradeable,
      kuery: request.query.kuery,
    });
    const totalInactive = request.query.showInactive
      ? await AgentService.countInactiveAgents(esClient, {
          kuery: request.query.kuery,
        })
      : 0;

    const body: GetAgentsResponse = {
      list: agents.map((agent) => ({
        ...agent,
        status: AgentService.getAgentStatus(agent),
      })),
      total,
      totalInactive,
      page,
      perPage,
    };
    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const putAgentsReassignHandler: RequestHandler<
  TypeOf<typeof PutAgentReassignRequestSchema.params>,
  undefined,
  TypeOf<typeof PutAgentReassignRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const esClient = context.core.elasticsearch.client.asInternalUser;
  try {
    await AgentService.reassignAgent(
      soClient,
      esClient,
      request.params.agentId,
      request.body.policy_id
    );

    const body: PutAgentReassignResponse = {};
    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const postBulkAgentsReassignHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostBulkAgentReassignRequestSchema.body>
> = async (context, request, response) => {
  if (!licenseService.isGoldPlus()) {
    return response.customError({
      statusCode: 403,
      body: { message: 'Requires Gold license' },
    });
  }

  const soClient = context.core.savedObjects.client;
  const esClient = context.core.elasticsearch.client.asInternalUser;
  const agentOptions = Array.isArray(request.body.agents)
    ? { agentIds: request.body.agents }
    : { kuery: request.body.agents };

  try {
    const results = await AgentService.reassignAgents(
      soClient,
      esClient,
      agentOptions,
      request.body.policy_id
    );

    const body = results.items.reduce<PostBulkAgentReassignResponse>((acc, so) => {
      acc[so.id] = {
        success: !so.error,
        error: so.error?.message,
      };
      return acc;
    }, {});

    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const getAgentStatusForAgentPolicyHandler: RequestHandler<
  undefined,
  TypeOf<typeof GetAgentStatusRequestSchema.query>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const esClient = context.core.elasticsearch.client.asCurrentUser;

  try {
    // TODO change path
    const results = await AgentService.getAgentStatusForAgentPolicy(
      soClient,
      esClient,
      request.query.policyId,
      request.query.kuery
    );

    const body: GetAgentStatusResponse = { results };

    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};
