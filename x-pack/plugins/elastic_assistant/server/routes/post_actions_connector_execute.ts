/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';

import { schema } from '@kbn/config-schema';
import {
  API_VERSIONS,
  ExecuteConnectorRequestBody,
  Message,
  Replacements,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { INVOKE_ASSISTANT_ERROR_EVENT } from '../lib/telemetry/event_based_telemetry';
import { POST_ACTIONS_CONNECTOR_EXECUTE } from '../../common/constants';
import { buildResponse } from '../lib/build_response';
import { ElasticAssistantRequestHandlerContext, GetElser } from '../types';
import {
  appendAssistantMessageToConversation,
  DEFAULT_PLUGIN_NAME,
  getIsKnowledgeBaseEnabled,
  getPluginNameFromRequest,
  getSystemPromptFromUserConversation,
  langChainExecute,
} from './helpers';

export const postActionsConnectorExecuteRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>,
  getElser: GetElser
) => {
  router.versioned
    .post({
      access: 'internal',
      path: POST_ACTIONS_CONNECTOR_EXECUTE,
      options: {
        tags: ['access:elasticAssistant'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(ExecuteConnectorRequestBody),
            params: schema.object({
              connectorId: schema.string(),
            }),
          },
        },
      },
      async (context, request, response) => {
        const abortSignal = getRequestAbortedSignal(request.events.aborted$);

        const resp = buildResponse(response);
        const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
        const assistantContext = ctx.elasticAssistant;
        const logger: Logger = assistantContext.logger;
        const telemetry = assistantContext.telemetry;
        let onLlmResponse;

        try {
          const authenticatedUser = assistantContext.getCurrentUser();
          if (authenticatedUser == null) {
            return response.unauthorized({
              body: `Authenticated user not found`,
            });
          }
          let latestReplacements: Replacements = request.body.replacements;
          const onNewReplacements = (newReplacements: Replacements) => {
            latestReplacements = { ...latestReplacements, ...newReplacements };
          };

          let messages;
          let newMessage: Pick<Message, 'content' | 'role'> | undefined;
          const conversationId = request.body.conversationId;
          const actionTypeId = request.body.actionTypeId;
          const connectorId = decodeURIComponent(request.params.connectorId);

          // if message is undefined, it means the user is regenerating a message from the stored conversation
          if (request.body.message) {
            newMessage = {
              content: request.body.message,
              role: 'user',
            };
          }

          // get the actions plugin start contract from the request context:
          const actions = ctx.elasticAssistant.actions;
          const actionsClient = await actions.getActionsClientWithRequest(request);

          const conversationsDataClient =
            await assistantContext.getAIAssistantConversationsDataClient();
          const promptsDataClient = await assistantContext.getAIAssistantPromptsDataClient();

          onLlmResponse = async (
            content: string,
            traceData: Message['traceData'] = {},
            isError = false
          ): Promise<void> => {
            if (conversationsDataClient && conversationId) {
              await appendAssistantMessageToConversation({
                conversationId,
                conversationsDataClient,
                messageContent: content,
                replacements: latestReplacements,
                isError,
                traceData,
              });
            }
          };
          let systemPrompt;
          if (conversationsDataClient && promptsDataClient && conversationId) {
            systemPrompt = await getSystemPromptFromUserConversation({
              conversationsDataClient,
              conversationId,
              promptsDataClient,
            });
          }
          return await langChainExecute({
            abortSignal,
            isStream: request.body.subAction !== 'invokeAI',
            actionsClient,
            actionTypeId,
            connectorId,
            conversationId,
            context: ctx,
            getElser,
            logger,
            messages: (newMessage ? [newMessage] : messages) ?? [],
            onLlmResponse,
            onNewReplacements,
            replacements: latestReplacements,
            request,
            response,
            telemetry,
            systemPrompt,
          });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);
          if (onLlmResponse) {
            await onLlmResponse(error.message, {}, true);
          }
          const pluginName = getPluginNameFromRequest({
            request,
            defaultPluginName: DEFAULT_PLUGIN_NAME,
            logger,
          });
          const v2KnowledgeBaseEnabled =
            assistantContext.getRegisteredFeatures(pluginName).assistantKnowledgeBaseByDefault;
          const kbDataClient =
            (await assistantContext.getAIAssistantKnowledgeBaseDataClient({
              v2KnowledgeBaseEnabled,
            })) ?? undefined;
          const isEnabledKnowledgeBase = await getIsKnowledgeBaseEnabled(kbDataClient);

          telemetry.reportEvent(INVOKE_ASSISTANT_ERROR_EVENT.eventType, {
            actionTypeId: request.body.actionTypeId,
            model: request.body.model,
            errorMessage: error.message,
            assistantStreamingEnabled: request.body.subAction !== 'invokeAI',
            isEnabledKnowledgeBase,
          });

          return resp.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
