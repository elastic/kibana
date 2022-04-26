/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';

import type {
  PostAgentUnenrollResponse,
  PostBulkAgentUnenrollResponse,
} from '../../../common/types';
import type {
  PostAgentUnenrollRequestSchema,
  PostBulkAgentUnenrollRequestSchema,
} from '../../types';
import { licenseService } from '../../services';
import * as AgentService from '../../services/agents';
import { defaultIngestErrorHandler } from '../../errors';

export const postAgentUnenrollHandler: RequestHandler<
  TypeOf<typeof PostAgentUnenrollRequestSchema.params>,
  undefined,
  TypeOf<typeof PostAgentUnenrollRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  try {
    await AgentService.unenrollAgent(soClient, esClient, request.params.agentId, {
      force: request.body?.force,
      revoke: request.body?.revoke,
    });

    const body: PostAgentUnenrollResponse = {};
    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const postBulkAgentsUnenrollHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostBulkAgentUnenrollRequestSchema.body>
> = async (context, request, response) => {
  if (!licenseService.isGoldPlus()) {
    return response.customError({
      statusCode: 403,
      body: { message: 'Requires Gold license' },
    });
  }

  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const agentOptions = Array.isArray(request.body.agents)
    ? { agentIds: request.body.agents }
    : { kuery: request.body.agents };

  try {
    const results = await AgentService.unenrollAgents(soClient, esClient, {
      ...agentOptions,
      revoke: request.body?.revoke,
      force: request.body?.force,
    });
    const body = results.items.reduce<PostBulkAgentUnenrollResponse>((acc, so) => {
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
