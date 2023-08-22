/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';

import { POST_ACTIONS_CONNECTOR_EXECUTE } from '../../common/constants';
import {
  getLangChainMessages,
  unsafeGetAssistantMessagesFromRequest,
} from '../lib/langchain/helpers';
import { buildResponse } from '../lib/build_response';
import { buildRouteValidation } from '../schemas/common';
import {
  PostActionsConnectorExecuteBody,
  PostActionsConnectorExecutePathParams,
} from '../schemas/post_actions_connector_execute';
import { ElasticAssistantRequestHandlerContext } from '../types';
import { executeCustomLlmChain } from '../lib/langchain/execute_custom_llm_chain';

export const postActionsConnectorExecuteRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
) => {
  router.post(
    {
      path: POST_ACTIONS_CONNECTOR_EXECUTE,
      validate: {
        body: buildRouteValidation(PostActionsConnectorExecuteBody),
        params: buildRouteValidation(PostActionsConnectorExecutePathParams),
      },
    },
    async (context, request, response) => {
      const resp = buildResponse(response);

      try {
        // get the actions plugin start contract from the request context:
        const actions = (await context.elasticAssistant).actions;

        // get the connector id from the request params:
        const connectorId = decodeURIComponent(request.params.connectorId);

        const rawSubActionParamsBody = request.body.params.subActionParams.body;

        // get the assistant messages from the request body:
        const assistantMessages = unsafeGetAssistantMessagesFromRequest(rawSubActionParamsBody);

        // convert the assistant messages to LangChain messages:
        const langchainMessages = getLangChainMessages(assistantMessages);

        const langchainResponseBody = await executeCustomLlmChain({
          actions,
          connectorId,
          langchainMessages,
          request,
        });

        return response.ok({
          body: langchainResponseBody,
        });
      } catch (err) {
        const error = transformError(err);

        return resp.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
