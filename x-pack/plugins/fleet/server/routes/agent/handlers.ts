/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile } from 'fs/promises';
import Path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';
import { uniq } from 'lodash';
import semverGte from 'semver/functions/gte';
import semverGt from 'semver/functions/gt';
import semverCoerce from 'semver/functions/coerce';
import { type RequestHandler, SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';

import { appContextService } from '../../services';

const MINIMUM_SUPPORTED_VERSION = '7.17.0';

import type {
  GetAgentsResponse,
  GetOneAgentResponse,
  GetAgentStatusResponse,
  PutAgentReassignResponse,
  GetAgentTagsResponse,
  GetAvailableVersionsResponse,
  GetActionStatusResponse,
  GetAgentUploadsResponse,
} from '../../../common/types';
import type {
  GetAgentsRequestSchema,
  GetTagsRequestSchema,
  GetOneAgentRequestSchema,
  UpdateAgentRequestSchema,
  DeleteAgentRequestSchema,
  GetAgentStatusRequestSchema,
  GetAgentDataRequestSchema,
  PutAgentReassignRequestSchema,
  PostBulkAgentReassignRequestSchema,
  PostBulkUpdateAgentTagsRequestSchema,
  GetActionStatusRequestSchema,
  GetAgentUploadFileRequestSchema,
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
    : { kuery: request.body.agents };

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
      getTotalInactive: true,
    });

    const { total, page, perPage, totalInactive = 0 } = agentRes;
    let { agents } = agentRes;

    // Assign metrics
    if (request.query.withMetrics) {
      agents = await fetchAndAssignAgentMetrics(esClientCurrentUser, agents);
    }

    const body: GetAgentsResponse = {
      list: agents, // deprecated
      items: agents,
      total,
      totalInactive,
      page,
      perPage,
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

export const putAgentsReassignHandler: RequestHandler<
  TypeOf<typeof PutAgentReassignRequestSchema.params>,
  undefined,
  TypeOf<typeof PutAgentReassignRequestSchema.body>
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

export const postBulkAgentsReassignHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostBulkAgentReassignRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const agentOptions = Array.isArray(request.body.agents)
    ? { agentIds: request.body.agents }
    : { kuery: request.body.agents };

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

// Read a static file generated at build time
export const getAvailableVersionsHandler: RequestHandler = async (context, request, response) => {
  const AGENT_VERSION_BUILD_FILE = 'x-pack/plugins/fleet/target/agent_versions_list.json';
  let versionsToDisplay: string[] = [];

  const kibanaVersion = appContextService.getKibanaVersion();
  const kibanaVersionCoerced = semverCoerce(kibanaVersion)?.version ?? kibanaVersion;

  try {
    const file = await readFile(Path.join(REPO_ROOT, AGENT_VERSION_BUILD_FILE), 'utf-8');

    // Exclude versions older than MINIMUM_SUPPORTED_VERSION and pre-release versions (SNAPSHOT, rc..)
    // De-dup and sort in descending order
    const data: string[] = JSON.parse(file);

    const versions = data
      .map((item: any) => semverCoerce(item)?.version || '')
      .filter((v: any) => semverGte(v, MINIMUM_SUPPORTED_VERSION))
      .sort((a: any, b: any) => (semverGt(a, b) ? -1 : 1));
    const parsedVersions = uniq(versions) as string[];

    // Add current version if not already present
    const hasCurrentVersion = parsedVersions.some((v) => v === kibanaVersionCoerced);
    versionsToDisplay = !hasCurrentVersion
      ? [kibanaVersionCoerced].concat(parsedVersions)
      : parsedVersions;
    const body: GetAvailableVersionsResponse = { items: versionsToDisplay };
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
