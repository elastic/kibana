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
  DEFAULT_PLUGIN_NAME,
  appendAssistantMessageToConversation,
  getPluginNameFromRequest,
  langChainExecute,
  nonLangChainExecute,
  updateConversationWithUserInput,
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

          // Fetch any tools registered by the request's originating plugin
          const pluginName = getPluginNameFromRequest({
            request,
            defaultPluginName: DEFAULT_PLUGIN_NAME,
            logger,
          });
          const isGraphAvailable =
            assistantContext.getRegisteredFeatures(pluginName).assistantKnowledgeBaseByDefault &&
            request.body.isEnabledKnowledgeBase;

          // TODO: remove non-graph persistance when KB will be enabled by default
          if (!isGraphAvailable && conversationId && conversationsDataClient) {
            const updatedConversation = await updateConversationWithUserInput({
              actionsClient,
              actionTypeId,
              connectorId,
              conversationId,
              conversationsDataClient,
              logger,
              replacements: latestReplacements,
              newMessages: newMessage ? [newMessage] : [],
              model: request.body.model,
            });
            if (updatedConversation == null) {
              return response.badRequest({
                body: `conversation id: "${conversationId}" not updated`,
              });
            }
            // messages are anonymized by conversationsDataClient
            messages = updatedConversation?.messages?.map((c) => ({
              role: c.role,
              content: c.content,
            }));
          }

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

          if (!request.body.isEnabledKnowledgeBase && !request.body.isEnabledRAGAlerts) {
            // if not langchain, call execute action directly and return the response:
            return await nonLangChainExecute({
              abortSignal,
              actionsClient,
              actionTypeId,
              connectorId,
              logger,
              messages: messages ?? [],
              onLlmResponse,
              request,
              response,
              telemetry,
            });
          }

          return await langChainExecute({
            abortSignal,
            isStream: request.body.subAction !== 'invokeAI',
            isEnabledKnowledgeBase: request.body.isEnabledKnowledgeBase ?? false,
            actionsClient,
            actionTypeId,
            connectorId,
            conversationId,
            context: ctx,
            getElser,
            logger,
            messages: (isGraphAvailable && newMessage ? [newMessage] : messages) ?? [],
            onLlmResponse,
            onNewReplacements,
            replacements: latestReplacements,
            request,
            response,
            telemetry,
          });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);
          if (onLlmResponse) {
            await onLlmResponse(error.message, {}, true);
          }
          telemetry.reportEvent(INVOKE_ASSISTANT_ERROR_EVENT.eventType, {
            actionTypeId: request.body.actionTypeId,
            isEnabledKnowledgeBase: request.body.isEnabledKnowledgeBase,
            isEnabledRAGAlerts: request.body.isEnabledRAGAlerts,
            model: request.body.model,
            errorMessage: error.message,
            assistantStreamingEnabled: request.body.subAction !== 'invokeAI',
          });

          return resp.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
