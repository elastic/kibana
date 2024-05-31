/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { Logger } from '@kbn/core/server';
import {
  ELASTIC_AI_ASSISTANT_CHAT_COMPLETE_URL,
  ChatCompleteProps,
  API_VERSIONS,
  Message,
  Replacements,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import { ElasticAssistantPluginRouter, GetElser } from '../../types';
import { buildResponse } from '../utils';
import {
  UPGRADE_LICENSE_MESSAGE,
  appendAssistantMessageToConversation,
  createOrUpdateConversationWithUserInput,
  hasAIAssistantLicense,
  langChainExecute,
} from '../helpers';

export const chatCompleteRoute = (
  router: ElasticAssistantPluginRouter,
  getElser: GetElser
): void => {
  router.versioned
    .post({
      access: 'public',
      path: ELASTIC_AI_ASSISTANT_CHAT_COMPLETE_URL,

      options: {
        tags: ['access:elasticAssistant'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(ChatCompleteProps),
          },
        },
      },
      async (context, request, response) => {
        const abortSignal = getRequestAbortedSignal(request.events.aborted$);
        const assistantResponse = buildResponse(response);
        try {
          const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
          const logger: Logger = ctx.elasticAssistant.logger;
          const telemetry = ctx.elasticAssistant.telemetry;
          let onLlmResponse;

          const license = ctx.licensing.license;
          if (!hasAIAssistantLicense(license)) {
            return response.forbidden({
              body: {
                message: UPGRADE_LICENSE_MESSAGE,
              },
            });
          }
          const authenticatedUser = ctx.elasticAssistant.getCurrentUser();
          if (authenticatedUser == null) {
            return assistantResponse.error({
              body: `Authenticated user not found`,
              statusCode: 401,
            });
          }

          const conversationsDataClient =
            await ctx.elasticAssistant.getAIAssistantConversationsDataClient();

          const anonymizationFieldsDataClient =
            await ctx.elasticAssistant.getAIAssistantAnonymizationFieldsDataClient();

          let messages;
          const conversationId = request.body.conversationId;
          const connectorId = request.body.connectorId;

          let latestReplacements: Replacements = {};
          const onNewReplacements = (newReplacements: Replacements) => {
            latestReplacements = { ...latestReplacements, ...newReplacements };
          };

          // get the actions plugin start contract from the request context:
          const actions = (await context.elasticAssistant).actions;
          const actionsClient = await actions.getActionsClientWithRequest(request);
          const actionTypeId =
            (await actionsClient.getAllSystemConnectors()).find((c) => c.id === connectorId)
              ?.actionTypeId ?? '.gen-ai';

          // replacements

          if (request.body.persist && conversationsDataClient) {
            const updatedConversation = await createOrUpdateConversationWithUserInput({
              actionsClient,
              actionTypeId,
              authenticatedUser,
              connectorId,
              conversationId,
              conversationsDataClient,
              promptId: request.body.promptId,
              logger,
              replacements: latestReplacements,
              newMessages: request.body.messages
                .filter((f) => f.role === 'assistant' || f.role === 'user')
                .map((m) => ({
                  role: m.role,
                  content: m.content ?? '',
                })) as Message[],
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

            onLlmResponse = async (
              content: string,
              traceData: Message['traceData'] = {},
              isError = false
            ): Promise<void> => {
              if (updatedConversation && conversationsDataClient) {
                await appendAssistantMessageToConversation({
                  conversation: updatedConversation,
                  conversationsDataClient,
                  messageContent: content,
                  replacements: latestReplacements,
                  isError,
                  traceData,
                });
              }
            };
          }

          return await langChainExecute({
            abortSignal,
            actionsClient,
            actionTypeId,
            assistantContext: ctx.elasticAssistant,
            connectorId,
            context,
            getElser,
            logger,
            messages: messages ?? [],
            onLlmResponse,
            onNewReplacements,
            replacements: latestReplacements,
            request,
            response,
            telemetry,
          });
        } catch (err) {
          const error = transformError(err as Error);
          return assistantResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
