/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// handlers that handle agent actions request

import { RequestHandler } from 'kibana/server';
import { TypeOf } from '@kbn/config-schema';
import { PostNewAgentActionRequestSchema } from '../../types/rest_spec';
import { ActionsService } from '../../services/agents';
import { NewAgentAction } from '../../../common/types/models';
import { PostNewAgentActionResponse } from '../../../common/types/rest_spec';

export const postNewAgentActionHandlerBuilder = function (
  actionsService: ActionsService
): RequestHandler<
  TypeOf<typeof PostNewAgentActionRequestSchema.params>,
  undefined,
  TypeOf<typeof PostNewAgentActionRequestSchema.body>
> {
  return async (context, request, response) => {
    try {
      const soClient = context.core.savedObjects.client;

      const agent = await actionsService.getAgent(soClient, request.params.agentId);

      const newAgentAction = request.body.action as NewAgentAction;

      const savedAgentAction = await actionsService.createAgentAction(soClient, {
        created_at: new Date().toISOString(),
        ...newAgentAction,
        agent_id: agent.id,
      });

      const body: PostNewAgentActionResponse = {
        success: true,
        item: savedAgentAction,
      };

      return response.ok({ body });
    } catch (e) {
      if (e.isBoom) {
        return response.customError({
          statusCode: e.output.statusCode,
          body: { message: e.message },
        });
      }

      return response.customError({
        statusCode: 500,
        body: { message: e.message },
      });
    }
  };
};
