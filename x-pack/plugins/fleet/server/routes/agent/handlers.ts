/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import { type RequestHandler, SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';

import type { Script } from '@elastic/elasticsearch/lib/api/types';

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
  Agent,
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
  DeleteAgentUploadFileRequestSchema,
  PostRetrieveAgentsByActionsRequestSchema,
  FleetRequestHandler,
} from '../../types';
import { FleetNotFoundError } from '../../errors';
import * as AgentService from '../../services/agents';
import { fetchAndAssignAgentMetrics } from '../../services/agents/agent_metrics';
import { getAgentStatusForAgentPolicy } from '../../services/agents';
import { isAgentInNamespace } from '../../services/spaces/agent_namespaces';
import { getCurrentNamespace } from '../../services/spaces/get_current_namespace';
import { getPackageInfo } from '../../services/epm/packages';
import { generateTemplateIndexPattern } from '../../services/epm/elasticsearch/template/template';
import { buildAgentStatusRuntimeField } from '../../services/agents/build_status_runtime_field';

async function verifyNamespace(agent: Agent, namespace?: string) {
  if (!(await isAgentInNamespace(agent, namespace))) {
    throw new FleetNotFoundError(`${agent.id} not found in namespace`);
  }
}

export const getAgentHandler: FleetRequestHandler<
  TypeOf<typeof GetOneAgentRequestSchema.params>,
  TypeOf<typeof GetOneAgentRequestSchema.query>
> = async (context, request, response) => {
  try {
    const [coreContext, fleetContext] = await Promise.all([context.core, context.fleet]);
    const esClientCurrentUser = coreContext.elasticsearch.client.asCurrentUser;

    let agent = await fleetContext.agentClient.asCurrentUser.getAgent(request.params.agentId);
    await verifyNamespace(agent, getCurrentNamespace(coreContext.savedObjects.client));

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

    throw error;
  }
};

export const deleteAgentHandler: FleetRequestHandler<
  TypeOf<typeof DeleteAgentRequestSchema.params>
> = async (context, request, response) => {
  const [coreContext, fleetContext] = await Promise.all([context.core, context.fleet]);
  const esClient = coreContext.elasticsearch.client.asInternalUser;

  try {
    const agent = await fleetContext.agentClient.asCurrentUser.getAgent(request.params.agentId);
    await verifyNamespace(agent, getCurrentNamespace(coreContext.savedObjects.client));

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

    throw error;
  }
};

export const updateAgentHandler: FleetRequestHandler<
  TypeOf<typeof UpdateAgentRequestSchema.params>,
  undefined,
  TypeOf<typeof UpdateAgentRequestSchema.body>
> = async (context, request, response) => {
  const [coreContext, fleetContext] = await Promise.all([context.core, context.fleet]);
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
    const agent = await fleetContext.agentClient.asCurrentUser.getAgent(request.params.agentId);
    await verifyNamespace(agent, getCurrentNamespace(soClient));

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

    throw error;
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

  const results = await AgentService.updateAgentTags(
    soClient,
    esClient,
    { ...agentOptions, batchSize: request.body.batchSize },
    request.body.tagsToAdd ?? [],
    request.body.tagsToRemove ?? []
  );

  return response.ok({ body: { actionId: results.actionId } });
};

export const getAgentsHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof GetAgentsRequestSchema.query>
> = async (context, request, response) => {
  const [coreContext, fleetContext] = await Promise.all([context.core, context.fleet]);
  const { agentClient } = fleetContext;
  const esClientCurrentUser = coreContext.elasticsearch.client.asCurrentUser;

  const agentRes = await agentClient.asCurrentUser.listAgents({
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
};

export const getAgentTagsHandler: RequestHandler<
  undefined,
  TypeOf<typeof GetTagsRequestSchema.query>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const soClient = coreContext.savedObjects.client;

  const tags = await AgentService.getAgentTags(soClient, esClient, {
    showInactive: request.query.showInactive,
    kuery: request.query.kuery,
  });

  const body: GetAgentTagsResponse = {
    items: tags,
  };
  return response.ok({ body });
};

export const putAgentsReassignHandlerDeprecated: RequestHandler<
  TypeOf<typeof PutAgentReassignRequestSchemaDeprecated.params>,
  undefined,
  TypeOf<typeof PutAgentReassignRequestSchemaDeprecated.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  await AgentService.reassignAgent(
    soClient,
    esClient,
    request.params.agentId,
    request.body.policy_id
  );

  const body: PutAgentReassignResponse = {};
  return response.ok({ body });
};

export const postAgentReassignHandler: RequestHandler<
  TypeOf<typeof PostAgentReassignRequestSchema.params>,
  undefined,
  TypeOf<typeof PostAgentReassignRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  await AgentService.reassignAgent(
    soClient,
    esClient,
    request.params.agentId,
    request.body.policy_id
  );

  const body: PostAgentReassignResponse = {};
  return response.ok({ body });
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

  const results = await AgentService.reassignAgents(
    soClient,
    esClient,
    { ...agentOptions, batchSize: request.body.batchSize },
    request.body.policy_id
  );

  return response.ok({ body: { actionId: results.actionId } });
};

export const getAgentStatusForAgentPolicyHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof GetAgentStatusRequestSchema.query>
> = async (context, request, response) => {
  const [coreContext, fleetContext] = await Promise.all([context.core, context.fleet]);
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const soClient = fleetContext.internalSoClient;

  const parsePolicyIds = (policyIds: string | string[] | undefined): string[] | undefined => {
    if (!policyIds || !policyIds.length) {
      return undefined;
    }

    return Array.isArray(policyIds) ? policyIds : [policyIds];
  };

  const results = await getAgentStatusForAgentPolicy(
    esClient,
    soClient,
    request.query.policyId,
    request.query.kuery,
    coreContext.savedObjects.client.getCurrentNamespace(),
    parsePolicyIds(request.query.policyIds)
  );

  const body: GetAgentStatusResponse = { results };

  return response.ok({ body });
};

export const getAgentDataHandler: RequestHandler<
  undefined,
  TypeOf<typeof GetAgentDataRequestSchema.query>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asCurrentUser;
  const agentsIds = isStringArray(request.query.agentsIds)
    ? request.query.agentsIds
    : [request.query.agentsIds];
  const { pkgName, pkgVersion, previewData: returnDataPreview } = request.query;

  // If a package is specified, get data stream patterns for that package
  // and scope incoming data query to that pattern
  let dataStreamPattern: string | undefined;
  if (pkgName && pkgVersion) {
    const packageInfo = await getPackageInfo({
      savedObjectsClient: coreContext.savedObjects.client,
      prerelease: true,
      pkgName,
      pkgVersion,
    });
    dataStreamPattern = (packageInfo.data_streams || [])
      .map((ds) => generateTemplateIndexPattern(ds))
      .join(',');
  }

  const { items, dataPreview } = await AgentService.getIncomingDataByAgentsId({
    esClient,
    agentsIds,
    dataStreamPattern,
    returnDataPreview,
  });

  const body = { items, dataPreview };

  return response.ok({ body });
};

function isStringArray(arr: unknown | string[]): arr is string[] {
  return Array.isArray(arr) && arr.every((p) => typeof p === 'string');
}

export const getAgentStatusRuntimeFieldHandler: RequestHandler = async (
  context,
  request,
  response
) => {
  const runtimeFields = await buildAgentStatusRuntimeField();

  return response.ok({ body: (runtimeFields.status.script as Script)!.source! });
};

export const getAvailableVersionsHandler: RequestHandler = async (context, request, response) => {
  const availableVersions = await AgentService.getAvailableVersions();
  const body: GetAvailableVersionsResponse = { items: availableVersions };

  return response.ok({ body });
};

export const getActionStatusHandler: RequestHandler<
  undefined,
  TypeOf<typeof GetActionStatusRequestSchema.query>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;

  const actionStatuses = await AgentService.getActionStatuses(
    esClient,
    request.query,
    getCurrentNamespace(coreContext.savedObjects.client)
  );
  const body: GetActionStatusResponse = { items: actionStatuses };
  return response.ok({ body });
};

export const postRetrieveAgentsByActionsHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostRetrieveAgentsByActionsRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;

  const agents = await AgentService.getAgentsByActionsIds(esClient, request.body.actionIds);
  const body: PostRetrieveAgentsByActionsResponse = { items: agents };
  return response.ok({ body });
};

export const getAgentUploadsHandler: RequestHandler<
  TypeOf<typeof GetOneAgentRequestSchema.params>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const body: GetAgentUploadsResponse = {
    items: await AgentService.getAgentUploads(esClient, request.params.agentId),
  };

  return response.ok({ body });
};

export const getAgentUploadFileHandler: RequestHandler<
  TypeOf<typeof GetAgentUploadFileRequestSchema.params>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const resp = await AgentService.getAgentUploadFile(
    esClient,
    request.params.fileId,
    request.params.fileName
  );

  return response.ok(resp);
};

export const deleteAgentUploadFileHandler: RequestHandler<
  TypeOf<typeof DeleteAgentUploadFileRequestSchema.params>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const resp = await AgentService.deleteAgentUploadFile(esClient, request.params.fileId);

  return response.ok({ body: resp });
};
