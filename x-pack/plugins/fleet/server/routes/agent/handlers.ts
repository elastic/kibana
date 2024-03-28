/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import { type RequestHandler, SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';

import type {
  GetAgentsResponse,
  GetOneAgentResponse,
  GetAgentStatusResponse,
  PutAgentReassignResponse,
  GetAgentTagsResponse,
  GetAvailableVersionsResponse,
  GetActionStatusResponse,
  GetAgentUploadsResponse,
  PostAgentReassignResponse,
  PostRetrieveAgentsByActionsResponse,
} from '../../../common/types';
import type {
  GetAgentsRequestSchema,
  GetTagsRequestSchema,
  GetOneAgentRequestSchema,
  UpdateAgentRequestSchema,
  DeleteAgentRequestSchema,
  GetAgentStatusRequestSchema,
  GetAgentDataRequestSchema,
  PutAgentReassignRequestSchemaDeprecated,
  PostAgentReassignRequestSchema,
  PostBulkAgentReassignRequestSchema,
  PostBulkUpdateAgentTagsRequestSchema,
  GetActionStatusRequestSchema,
  GetAgentUploadFileRequestSchema,
  PostRetrieveAgentsByActionsRequestSchema,
} from '../../types';
import { defaultFleetErrorHandler } from '../../errors';
import * as AgentService from '../../services/agents';
import { fetchAndAssignAgentMetrics } from '../../services/agents/agent_metrics';

export const getAgentHandler: RequestHandler<
  TypeOf<typeof GetOneAgentRequestSchema.params>,
  TypeOf<typeof GetOneAgentRequestSchema.query>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const esClientCurrentUser = coreContext.elasticsearch.client.asCurrentUser;
  const soClient = coreContext.savedObjects.client;

  try {
    let agent = await AgentService.getAgentById(esClient, soClient, request.params.agentId);

    if (request.query.withMetrics) {
      agent = (await fetchAndAssignAgentMetrics(esClientCurrentUser, [agent]))[0];
    }

    const body: GetOneAgentResponse = {
      item: agent,
    };

    return response.ok({ body });
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return response.notFound({
        body: { message: `Agent ${request.params.agentId} not found` },
      });
    }

    return defaultFleetErrorHandler({ error, response });
  }
};

export const deleteAgentHandler: RequestHandler<
  TypeOf<typeof DeleteAgentRequestSchema.params>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;

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

    return defaultFleetErrorHandler({ error, response });
  }
};

export const updateAgentHandler: RequestHandler<
  TypeOf<typeof UpdateAgentRequestSchema.params>,
  undefined,
  TypeOf<typeof UpdateAgentRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const soClient = coreContext.savedObjects.client;

  const partialAgent: any = {};
  if (request.body.user_provided_metadata) {
    partialAgent.user_provided_metadata = request.body.user_provided_metadata;
  }
  if (request.body.tags) {
    partialAgent.tags = uniq(request.body.tags);
  }

  try {
    await AgentService.updateAgent(esClient, request.params.agentId, partialAgent);
    const body = {
      item: await AgentService.getAgentById(esClient, soClient, request.params.agentId),
    };

    return response.ok({ body });
  } catch (error) {
    if (error.isBoom && error.output.statusCode === 404) {
      return response.notFound({
        body: { message: `Agent ${request.params.agentId} not found` },
      });
    }

    return defaultFleetErrorHandler({ error, response });
  }
};

export const bulkUpdateAgentTagsHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostBulkUpdateAgentTagsRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const soClient = coreContext.savedObjects.client;
  const agentOptions = Array.isArray(request.body.agents)
    ? { agentIds: request.body.agents }
    : { kuery: request.body.agents, showInactive: request.body.includeInactive };

  try {
    const results = await AgentService.updateAgentTags(
      soClient,
      esClient,
      { ...agentOptions, batchSize: request.body.batchSize },
      request.body.tagsToAdd ?? [],
      request.body.tagsToRemove ?? []
    );

    return response.ok({ body: { actionId: results.actionId } });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const getAgentsHandler: RequestHandler<
  undefined,
  TypeOf<typeof GetAgentsRequestSchema.query>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const esClientCurrentUser = coreContext.elasticsearch.client.asCurrentUser;
  const soClient = coreContext.savedObjects.client;

  try {
    const agentRes = await AgentService.getAgentsByKuery(esClient, soClient, {
      page: request.query.page,
      perPage: request.query.perPage,
      showInactive: request.query.showInactive,
      showUpgradeable: request.query.showUpgradeable,
      kuery: request.query.kuery,
      sortField: request.query.sortField,
      sortOrder: request.query.sortOrder,
      getStatusSummary: request.query.getStatusSummary,
    });

    const { total, page, perPage, statusSummary } = agentRes;
    let { agents } = agentRes;

    // Assign metrics
    if (request.query.withMetrics) {
      agents = await fetchAndAssignAgentMetrics(esClientCurrentUser, agents);
    }

    const body: GetAgentsResponse = {
      list: agents, // deprecated
      items: agents,
      total,
      page,
      perPage,
      ...(statusSummary ? { statusSummary } : {}),
    };
    return response.ok({ body });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const getAgentTagsHandler: RequestHandler<
  undefined,
  TypeOf<typeof GetTagsRequestSchema.query>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const soClient = coreContext.savedObjects.client;

  try {
    const tags = await AgentService.getAgentTags(soClient, esClient, {
      showInactive: request.query.showInactive,
      kuery: request.query.kuery,
    });

    const body: GetAgentTagsResponse = {
      items: tags,
    };
    return response.ok({ body });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const putAgentsReassignHandlerDeprecated: RequestHandler<
  TypeOf<typeof PutAgentReassignRequestSchemaDeprecated.params>,
  undefined,
  TypeOf<typeof PutAgentReassignRequestSchemaDeprecated.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
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
    return defaultFleetErrorHandler({ error, response });
  }
};

export const postAgentsReassignHandler: RequestHandler<
  TypeOf<typeof PostAgentReassignRequestSchema.params>,
  undefined,
  TypeOf<typeof PostAgentReassignRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  try {
    await AgentService.reassignAgent(
      soClient,
      esClient,
      request.params.agentId,
      request.body.policy_id
    );

    const body: PostAgentReassignResponse = {};
    return response.ok({ body });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const postBulkAgentReassignHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostBulkAgentReassignRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const agentOptions = Array.isArray(request.body.agents)
    ? { agentIds: request.body.agents }
    : { kuery: request.body.agents, showInactive: request.body.includeInactive };

  try {
    const results = await AgentService.reassignAgents(
      soClient,
      esClient,
      { ...agentOptions, batchSize: request.body.batchSize },
      request.body.policy_id
    );

    return response.ok({ body: { actionId: results.actionId } });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const getAgentStatusForAgentPolicyHandler: RequestHandler<
  undefined,
  TypeOf<typeof GetAgentStatusRequestSchema.query>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const soClient = coreContext.savedObjects.client;
  try {
    const results = await AgentService.getAgentStatusForAgentPolicy(
      esClient,
      soClient,
      request.query.policyId,
      request.query.kuery
    );

    const body: GetAgentStatusResponse = { results };

    return response.ok({ body });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const getAgentDataHandler: RequestHandler<
  undefined,
  TypeOf<typeof GetAgentDataRequestSchema.query>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asCurrentUser;
  try {
    const returnDataPreview = request.query.previewData;
    const agentIds = isStringArray(request.query.agentsIds)
      ? request.query.agentsIds
      : [request.query.agentsIds];

    const { items, dataPreview } = await AgentService.getIncomingDataByAgentsId(
      esClient,
      agentIds,
      returnDataPreview
    );

    const body = { items, dataPreview };

    return response.ok({ body });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

function isStringArray(arr: unknown | string[]): arr is string[] {
  return Array.isArray(arr) && arr.every((p) => typeof p === 'string');
}

export const getAvailableVersionsHandler: RequestHandler = async (context, request, response) => {
  try {
    const availableVersions = await AgentService.getAvailableVersions();
    const body: GetAvailableVersionsResponse = { items: availableVersions };

    return response.ok({ body });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const getActionStatusHandler: RequestHandler<
  undefined,
  TypeOf<typeof GetActionStatusRequestSchema.query>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;

  try {
    const actionStatuses = await AgentService.getActionStatuses(esClient, request.query);
    const body: GetActionStatusResponse = { items: actionStatuses };
    return response.ok({ body });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const postRetrieveAgentsByActionsHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostRetrieveAgentsByActionsRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;

  try {
    const agents = await AgentService.getAgentsByActionsIds(esClient, request.body.actionIds);
    const body: PostRetrieveAgentsByActionsResponse = { items: agents };
    return response.ok({ body });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const getAgentUploadsHandler: RequestHandler<
  TypeOf<typeof GetOneAgentRequestSchema.params>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  try {
    const body: GetAgentUploadsResponse = {
      items: await AgentService.getAgentUploads(esClient, request.params.agentId),
    };

    return response.ok({ body });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const getAgentUploadFileHandler: RequestHandler<
  TypeOf<typeof GetAgentUploadFileRequestSchema.params>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  try {
    const resp = await AgentService.getAgentUploadFile(
      esClient,
      request.params.fileId,
      request.params.fileName
    );

    return response.ok(resp);
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};
