/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';

import { schema } from '@kbn/config-schema';
import {
  ConversationResponse,
  ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
  ExecuteConnectorRequestBody,
  Message,
  getMessageContentWithoutReplacements,
} from '@kbn/elastic-assistant-common';
import {
  INVOKE_ASSISTANT_ERROR_EVENT,
  INVOKE_ASSISTANT_SUCCESS_EVENT,
} from '../lib/telemetry/event_based_telemetry';
import { executeAction } from '../lib/executor';
import { POST_ACTIONS_CONNECTOR_EXECUTE } from '../../common/constants';
import {
  getLangChainMessages,
  requestHasRequiredAnonymizationParams,
} from '../lib/langchain/helpers';
import { buildResponse } from '../lib/build_response';
import { ElasticAssistantRequestHandlerContext, GetElser } from '../types';
import { ESQL_RESOURCE } from './knowledge_base/constants';
import { callAgentExecutor } from '../lib/langchain/execute_custom_llm_chain';
import {
  DEFAULT_PLUGIN_NAME,
  getMessageFromRawResponse,
  getPluginNameFromRequest,
} from './helpers';
import { buildRouteValidationWithZod } from './route_validation';

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
        version: ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
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
        const resp = buildResponse(response);
        const assistantContext = await context.elasticAssistant;
        const logger: Logger = assistantContext.logger;
        const telemetry = assistantContext.telemetry;

        try {
          const authenticatedUser = assistantContext.getCurrentUser();
          if (authenticatedUser == null) {
            return response.unauthorized({
              body: `Authenticated user not found`,
            });
          }
          const dataClient = await assistantContext.getAIAssistantConversationsDataClient();

          let onMessageSent;
          let conversation: ConversationResponse | undefined | null;
          let prevMessages;
          if (request.body.conversationId) {
            conversation = await dataClient?.getConversation({
              id: request.body.conversationId,
              authenticatedUser,
            });
            prevMessages = conversation?.messages?.map((c) => ({
              role: c.role,
              content: c.content,
            }));

            if (conversation == null) {
              return response.notFound({
                body: `conversation id: "${request.body.conversationId}" not found`,
              });
            }

            if (request.body.replacements) {
              await dataClient?.updateConversation({
                existingConversation: conversation,
                conversationUpdateProps: {
                  id: request.body.conversationId,
                  replacements: request.body.replacements,
                },
              });
            }

            const dateTimeString = new Date().toLocaleString();

            const appendMessageFuncs = request.body.params.subActionParams.messages.map(
              (userMessage) => async () => {
                if (conversation != null) {
                  const res = await dataClient?.appendConversationMessages({
                    existingConversation: conversation,
                    messages: request.body.params.subActionParams.messages.map((m) => ({
                      content: getMessageContentWithoutReplacements({
                        messageContent: userMessage.content,
                        replacements: request.body.replacements as
                          | Record<string, string>
                          | undefined,
                      }),
                      role: m.role,
                      timestamp: dateTimeString,
                    })),
                  });
                  if (res == null) {
                    return response.badRequest({
                      body: `conversation id: "${request.body.conversationId}" not updated`,
                    });
                  }
                }
              }
            );

            await Promise.all(appendMessageFuncs.map((appendMessageFunc) => appendMessageFunc()));

            const updatedConversation = await dataClient?.getConversation({
              id: request.body.conversationId,
              authenticatedUser,
            });

            if (updatedConversation == null) {
              return response.notFound({
                body: `conversation id: "${request.body.conversationId}" not found`,
              });
            }

            onMessageSent = (content: string) => {
              if (updatedConversation) {
                dataClient?.appendConversationMessages({
                  existingConversation: updatedConversation,
                  messages: [
                    getMessageFromRawResponse({
                      rawContent: getMessageContentWithoutReplacements({
                        messageContent: content,
                        replacements: request.body.replacements as
                          | Record<string, string>
                          | undefined,
                      }),
                    }),
                  ],
                });
              }
            };
          }

          const connectorId = decodeURIComponent(request.params.connectorId);

          // get the actions plugin start contract from the request context:
          const actions = (await context.elasticAssistant).actions;

          // if not langchain, call execute action directly and return the response:
          if (
            !request.body.isEnabledKnowledgeBase &&
            !requestHasRequiredAnonymizationParams(request)
          ) {
            logger.debug('Executing via actions framework directly');
            const result = await executeAction({
              onMessageSent,
              actions,
              request,
              connectorId,
              params: {
                subAction: request.body.params.subAction,
                subActionParams: {
                  ...request.body.params.subActionParams,
                  messages: [
                    ...(prevMessages ?? []),
                    ...request.body.params.subActionParams.messages,
                  ],
                },
              },
            });
            telemetry.reportEvent(INVOKE_ASSISTANT_SUCCESS_EVENT.eventType, {
              isEnabledKnowledgeBase: request.body.isEnabledKnowledgeBase,
              isEnabledRAGAlerts: request.body.isEnabledRAGAlerts,
            });
            return response.ok({
              body: result,
            });
          }

          // TODO: Add `traceId` to actions request when calling via langchain
          logger.debug(
            `Executing via langchain, isEnabledKnowledgeBase: ${request.body.isEnabledKnowledgeBase}, isEnabledRAGAlerts: ${request.body.isEnabledRAGAlerts}`
          );

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
            ([...(prevMessages ?? []), request.body.params.subActionParams.messages] ??
              []) as unknown as Array<Pick<Message, 'content' | 'role'>>
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
            isEnabledKnowledgeBase: request.body.isEnabledKnowledgeBase ?? false,
            assistantTools,
            connectorId,
            elserId,
            esClient,
            kbResource: ESQL_RESOURCE,
            langChainMessages,
            logger,
            onNewReplacements,
            request,
            replacements: request.body.replacements as Record<string, string>,
            size: request.body.size,
            telemetry,
          });

          telemetry.reportEvent(INVOKE_ASSISTANT_SUCCESS_EVENT.eventType, {
            isEnabledKnowledgeBase: request.body.isEnabledKnowledgeBase,
            isEnabledRAGAlerts: request.body.isEnabledRAGAlerts,
          });

          if (conversation != null) {
            dataClient?.appendConversationMessages({
              existingConversation: conversation,
              messages: [
                getMessageFromRawResponse({
                  rawContent: langChainResponseBody.data,
                  traceData: langChainResponseBody.trace_data
                    ? {
                        traceId: langChainResponseBody.trace_data.trace_id,
                        transactionId: langChainResponseBody.trace_data.transaction_id,
                      }
                    : {},
                }),
              ],
            });
            await dataClient?.updateConversation({
              existingConversation: conversation,
              conversationUpdateProps: {
                id: conversation.id,
                replacements: latestReplacements,
              },
            });
          }
          return response.ok({
            body: {
              ...langChainResponseBody,
              replacements: latestReplacements,
            },
          });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);
          telemetry.reportEvent(INVOKE_ASSISTANT_ERROR_EVENT.eventType, {
            isEnabledKnowledgeBase: request.body.isEnabledKnowledgeBase,
            isEnabledRAGAlerts: request.body.isEnabledRAGAlerts,
            errorMessage: error.message,
          });

          return resp.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
