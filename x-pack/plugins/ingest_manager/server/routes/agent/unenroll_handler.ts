/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler } from 'src/core/server';
import { TypeOf } from '@kbn/config-schema';
import { PostAgentUnenrollResponse } from '../../../common/types';
import { PostAgentUnenrollRequestSchema } from '../../types';
import * as AgentService from '../../services/agents';
import { defaultIngestErrorHandler } from '../../errors';

export const postAgentsUnenrollHandler: RequestHandler<
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

    const body: PostAgentUnenrollResponse = {
      success: true,
    };
    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};
