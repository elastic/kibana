/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';

import { executeAction } from '../lib/executor';
import { POST_ACTIONS_CONNECTOR_EXECUTE } from '../../common/constants';
import {
  getLangChainMessages,
  requestHasRequiredAnonymizationParams,
} from '../lib/langchain/helpers';
import { buildResponse } from '../lib/build_response';
import { buildRouteValidation } from '../schemas/common';
import {
  PostActionsConnectorExecuteBody,
  PostActionsConnectorExecutePathParams,
} from '../schemas/post_actions_connector_execute';
import { ElasticAssistantRequestHandlerContext, GetElser } from '../types';
import { ESQL_RESOURCE } from './knowledge_base/constants';
import { callAgentExecutor } from '../lib/langchain/execute_custom_llm_chain';
import { DEFAULT_PLUGIN_NAME, getPluginNameFromRequest } from './helpers';

export const postActionsConnectorExecuteRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>,
  getElser: GetElser
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
      const logger: Logger = (await context.elasticAssistant).logger;

      try {
        const connectorId = decodeURIComponent(request.params.connectorId);

        // get the actions plugin start contract from the request context:
        const actions = (await context.elasticAssistant).actions;

        // if not langchain, call execute action directly and return the response:
        if (!request.body.assistantLangChain && !requestHasRequiredAnonymizationParams(request)) {
          logger.debug('Executing via actions framework directly');
          const result = await executeAction({ actions, request, connectorId });
          return response.ok({
            body: result,
          });
        }

        // TODO: Add `traceId` to actions request when calling via langchain
        logger.debug('Executing via langchain, assistantLangChain: true');

        // Fetch any tools registered by the request's originating plugin
        const pluginName = getPluginNameFromRequest({
          request,
          defaultPluginName: DEFAULT_PLUGIN_NAME,
          logger,
        });
        const assistantTools = (await context.elasticAssistant).getRegisteredTools(pluginName);

        // get a scoped esClient for assistant memory
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;

        // convert the assistant messages to LangChain messages:
        const langChainMessages = getLangChainMessages(
          request.body.params.subActionParams.messages
        );

        const elserId = await getElser(request, (await context.core).savedObjects.getClient());

        let latestReplacements = { ...request.body.replacements };
        const onNewReplacements = (newReplacements: Record<string, string>) => {
          latestReplacements = { ...latestReplacements, ...newReplacements };
        };

        const langChainResponseBody = await callAgentExecutor({
          alertsIndexPattern: request.body.alertsIndexPattern,
          allow: request.body.allow,
          allowReplacement: request.body.allowReplacement,
          actions,
          assistantLangChain: request.body.assistantLangChain,
          assistantTools,
          connectorId,
          elserId,
          esClient,
          kbResource: ESQL_RESOURCE,
          langChainMessages,
          logger,
          onNewReplacements,
          request,
          replacements: request.body.replacements,
          size: request.body.size,
        });

        return response.ok({
          body: {
            ...langChainResponseBody,
            replacements: latestReplacements,
          },
        });
      } catch (err) {
        logger.error(err);
        const error = transformError(err);

        return resp.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
