/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import type {
  PostAgentUnenrollResponse,
  PostBulkAgentUnenrollResponse,
} from '../../../common/types';
import type {
  PostAgentUnenrollRequestSchema,
  PostBulkAgentUnenrollRequestSchema,
  FleetRequestHandler,
} from '../../types';
import { licenseService } from '../../services';
import * as AgentService from '../../services/agents';
import { defaultIngestErrorHandler } from '../../errors';

export const postAgentUnenrollHandler: FleetRequestHandler<
  TypeOf<typeof PostAgentUnenrollRequestSchema.params>,
  undefined,
  TypeOf<typeof PostAgentUnenrollRequestSchema.body>
> = async (context, request, response) => {
  const soRepo = context.fleet.epm.internalSoRepo;
  const esClient = context.core.elasticsearch.client.asInternalUser;
  try {
    await AgentService.unenrollAgent(soRepo, esClient, request.params.agentId, {
      force: request.body?.force,
      revoke: request.body?.revoke,
    });

    const body: PostAgentUnenrollResponse = {};
    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const postBulkAgentsUnenrollHandler: FleetRequestHandler<
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

  const soRepo = context.fleet.epm.internalSoRepo;
  const esClient = context.core.elasticsearch.client.asInternalUser;
  const agentOptions = Array.isArray(request.body.agents)
    ? { agentIds: request.body.agents }
    : { kuery: request.body.agents };

  try {
    const results = await AgentService.unenrollAgents(soRepo, esClient, {
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
