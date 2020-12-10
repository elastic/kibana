/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler } from 'src/core/server';
import { TypeOf } from '@kbn/config-schema';
import { PostAgentUnenrollResponse, PostBulkAgentUnenrollResponse } from '../../../common/types';
import { PostAgentUnenrollRequestSchema, PostBulkAgentUnenrollRequestSchema } from '../../types';
import { licenseService } from '../../services';
import * as AgentService from '../../services/agents';
import { defaultIngestErrorHandler } from '../../errors';

export const postAgentUnenrollHandler: RequestHandler<
  TypeOf<typeof PostAgentUnenrollRequestSchema.params>,
  undefined,
  TypeOf<typeof PostAgentUnenrollRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  try {
    if (request.body?.force === true) {
      await AgentService.forceUnenrollAgent(soClient, request.params.agentId);
    } else {
      await AgentService.unenrollAgent(soClient, request.params.agentId);
    }

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
  const soClient = context.core.savedObjects.client;
  const unenrollAgents =
    request.body?.force === true ? AgentService.forceUnenrollAgents : AgentService.unenrollAgents;

  try {
    if (Array.isArray(request.body.agents)) {
      await unenrollAgents(soClient, { agentIds: request.body.agents });
    } else {
      await unenrollAgents(soClient, { kuery: request.body.agents });
    }

    const body: PostBulkAgentUnenrollResponse = {};
    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};
