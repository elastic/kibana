/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// handlers that handle agent actions request

import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';

import type {
  PostNewAgentActionRequestSchema,
  PostCancelActionRequestSchema,
} from '../../types/rest_spec';
import type { ActionsService } from '../../services/agents';
import type { PostNewAgentActionResponse } from '../../../common/types/rest_spec';
import { defaultFleetErrorHandler } from '../../errors';
import { getCurrentNamespace } from '../../services/spaces/get_current_namespace';

export const postNewAgentActionHandlerBuilder = function (
  actionsService: ActionsService
): RequestHandler<
  TypeOf<typeof PostNewAgentActionRequestSchema.params>,
  undefined,
  TypeOf<typeof PostNewAgentActionRequestSchema.body>
> {
  return async (context, request, response) => {
    try {
      const core = await context.core;
      const esClient = core.elasticsearch.client.asInternalUser;
      const soClient = core.savedObjects.client;

      const agent = await actionsService.getAgent(esClient, soClient, request.params.agentId);

      const newAgentAction = request.body.action;

      const savedAgentAction = await actionsService.createAgentAction(esClient, {
        created_at: new Date().toISOString(),
        ...newAgentAction,
        agents: [agent.id],
        namespaces: [getCurrentNamespace(soClient)],
      });

      const body: PostNewAgentActionResponse = {
        item: savedAgentAction,
      };

      return response.ok({ body });
    } catch (error) {
      return defaultFleetErrorHandler({ error, response });
    }
  };
};

export const postCancelActionHandlerBuilder = function (
  actionsService: ActionsService
): RequestHandler<TypeOf<typeof PostCancelActionRequestSchema.params>, undefined, undefined> {
  return async (context, request, response) => {
    try {
      const esClient = (await context.core).elasticsearch.client.asInternalUser;

      const action = await actionsService.cancelAgentAction(esClient, request.params.actionId);

      const body: PostNewAgentActionResponse = {
        item: action,
      };

      return response.ok({ body });
    } catch (error) {
      return defaultFleetErrorHandler({ error, response });
    }
  };
};
