/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// handlers that handle agent actions request

import type { RequestHandler } from 'kibana/server';
import type { TypeOf } from '@kbn/config-schema';

import type { PostNewAgentActionRequestSchema } from '../../types/rest_spec';
import type { ActionsService } from '../../services/agents';
import type { PostNewAgentActionResponse } from '../../../common/types/rest_spec';
import { defaultIngestErrorHandler } from '../../errors';

export const postNewAgentActionHandlerBuilder = function (
  actionsService: ActionsService
): RequestHandler<
  TypeOf<typeof PostNewAgentActionRequestSchema.params>,
  undefined,
  TypeOf<typeof PostNewAgentActionRequestSchema.body>
> {
  return async (context, request, response) => {
    try {
      const esClient = (await context.core).elasticsearch.client.asInternalUser;

      const agent = await actionsService.getAgent(esClient, request.params.agentId);

      const newAgentAction = request.body.action;

      const savedAgentAction = await actionsService.createAgentAction(esClient, {
        created_at: new Date().toISOString(),
        ...newAgentAction,
        agent_id: agent.id,
      });

      const body: PostNewAgentActionResponse = {
        item: savedAgentAction,
      };

      return response.ok({ body });
    } catch (error) {
      return defaultIngestErrorHandler({ error, response });
    }
  };
};
