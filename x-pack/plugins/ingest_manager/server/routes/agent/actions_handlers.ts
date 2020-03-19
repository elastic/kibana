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
import * as APIKeyService from '../../services/api_keys';
import { NewAgentAction } from '../../../common/types/models';
import { PostNewAgentActionResponse } from '../../../common/types/rest_spec';

export const postNewAgentActionHandlerBuilder = function(
  actionsService: ActionsService
): RequestHandler<
  TypeOf<typeof PostNewAgentActionRequestSchema.params>,
  undefined,
  TypeOf<typeof PostNewAgentActionRequestSchema.body>
> {
  return async (context, request, response) => {
    const soClient = actionsService.getSavedObjectsClientContract(request);

    const res = APIKeyService.parseApiKey(request.headers);

    const agent = await actionsService.getAgentByAccessAPIKeyId(soClient, res.apiKeyId as string);

    const newAgentAction = request.body.action as NewAgentAction;

    const savedAgentAction = await actionsService.updateAgentActions(
      soClient,
      agent,
      newAgentAction
    );

    const body: PostNewAgentActionResponse = {
      success: true,
      item: savedAgentAction,
    };

    return response.ok({ body });
  };
};
