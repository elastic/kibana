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
  ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
  ExecuteConnectorRequestBody,
  Message,
  Replacement,
  replaceAnonymizedValuesWithOriginalValues,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import {
  INVOKE_ASSISTANT_ERROR_EVENT,
  INVOKE_ASSISTANT_SUCCESS_EVENT,
} from '../lib/telemetry/event_based_telemetry';
import { executeAction } from '../lib/executor';
import { POST_ACTIONS_CONNECTOR_EXECUTE } from '../../common/constants';
import { getLangChainMessages } from '../lib/langchain/helpers';
import { buildResponse } from '../lib/build_response';
import { ElasticAssistantRequestHandlerContext, GetElser } from '../types';
import { ESQL_RESOURCE } from './knowledge_base/constants';
import { callAgentExecutor } from '../lib/langchain/execute_custom_llm_chain';
import {
  DEFAULT_PLUGIN_NAME,
  getMessageFromRawResponse,
  getPluginNameFromRequest,
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
          // Get the actions plugin start contract from the request context for the agents
          const actionsClient = await assistantContext.actions.getActionsClientWithRequest(request);

          const authenticatedUser = assistantContext.getCurrentUser();
          if (authenticatedUser == null) {
            return response.unauthorized({
              body: `Authenticated user not found`,
            });
          }
          const dataClient = await assistantContext.getAIAssistantConversationsDataClient();

          let latestReplacements: Replacement[] = request.body.replacements;
          const onNewReplacements = (newReplacements: Replacement[]) => {
            const latestReplacementsDict = latestReplacements.reduce(
              (acc: Record<string, string>, r) => {
                acc[r.value] = r.uuid;
                return acc;
              },
              {}
            );
            const newReplacementsDict = newReplacements.reduce((acc: Record<string, string>, r) => {
              acc[r.value] = r.uuid;
              return acc;
            }, {});

            const updatedReplacements = { ...latestReplacementsDict, ...newReplacementsDict };
            latestReplacements = Object.keys(updatedReplacements).map((key) => ({
              value: key,
              uuid: updatedReplacements[key],
            }));
          };

          let onLlmResponse;
          let prevMessages;
          let newMessage: Pick<Message, 'content' | 'role'> | undefined;
          const conversationId = request.body.conversationId;

          // if message is undefined, it means the user is regenerating a message from the stored conversation
          if (request.body.message) {
            newMessage = {
              content: request.body.message,
              role: 'user',
            };
          }

          if (conversationId) {
            const conversation = await dataClient?.getConversation({
              id: conversationId,
              authenticatedUser,
            });
            if (conversation == null) {
              return response.notFound({
                body: `conversation id: "${conversationId}" not found`,
              });
            }

            // messages are anonymized by dataClient
            prevMessages = conversation?.messages?.map((c) => ({
              role: c.role,
              content: c.content,
            }));

            if (request.body.message) {
              const res = await dataClient?.appendConversationMessages({
                existingConversation: conversation,
                messages: [
                  {
                    ...{
                      content: replaceAnonymizedValuesWithOriginalValues({
                        messageContent: request.body.message,
                        replacements: request.body.replacements,
                      }),
                      role: 'user',
                    },
                    timestamp: new Date().toISOString(),
                  },
                ],
              });

              if (res == null) {
                return response.badRequest({
                  body: `conversation id: "${conversationId}" not updated`,
                });
              }
            }
            const updatedConversation = await dataClient?.getConversation({
              id: conversationId,
              authenticatedUser,
            });

            if (updatedConversation == null) {
              return response.notFound({
                body: `conversation id: "${conversationId}" not found`,
              });
            }

            onLlmResponse = async (
              content: string,
              traceData: Message['traceData'] = {}
            ): Promise<void> => {
              if (updatedConversation) {
                await dataClient?.appendConversationMessages({
                  existingConversation: updatedConversation,
                  messages: [
                    getMessageFromRawResponse({
                      rawContent: replaceAnonymizedValuesWithOriginalValues({
                        messageContent: content,
                        replacements: latestReplacements,
                      }),
                      traceData,
                    }),
                  ],
                });
              }
              if (latestReplacements.length > 0) {
                await dataClient?.updateConversation({
                  conversationUpdateProps: {
                    id: conversationId,
                    replacements: latestReplacements,
                  },
                });
              }
            };
          }

          const connectorId = decodeURIComponent(request.params.connectorId);
          const connectors = await actionsClient.getBulk({
            ids: [connectorId],
            throwIfSystemAction: false,
          });

          // get the actions plugin start contract from the request context:
          const actions = (await context.elasticAssistant).actions;

          // if not langchain, call execute action directly and return the response:
          if (!request.body.isEnabledKnowledgeBase && !request.body.isEnabledRAGAlerts) {
            logger.debug('Executing via actions framework directly');

            const result = await executeAction({
              onLlmResponse,
              actions,
              request,
              connectorId,
              llmType: connectors[0]?.actionTypeId,
              params: {
                subAction: request.body.subAction,
                subActionParams: {
                  model: request.body.model,
                  messages: [...(prevMessages ?? []), ...(newMessage ? [newMessage] : [])],
                  ...(connectors[0]?.actionTypeId === '.gen-ai'
                    ? { n: 1, stop: null, temperature: 0.2 }
                    : { temperature: 0, stopSequences: [] }),
                },
              },
              logger,
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
            ([...(prevMessages ?? []), ...(newMessage ? [newMessage] : [])] ??
              []) as unknown as Array<Pick<Message, 'content' | 'role'>>
          );

          const elserId = await getElser(request, (await context.core).savedObjects.getClient());

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
            llmType: connectors[0]?.actionTypeId,
            kbResource: ESQL_RESOURCE,
            langChainMessages,
            logger,
            onNewReplacements,
            request,
            replacements: request.body.replacements,
            size: request.body.size,
            telemetry,
          });

          telemetry.reportEvent(INVOKE_ASSISTANT_SUCCESS_EVENT.eventType, {
            isEnabledKnowledgeBase: request.body.isEnabledKnowledgeBase,
            isEnabledRAGAlerts: request.body.isEnabledRAGAlerts,
          });

          if (conversationId) {
            // if conversationId is defined, onLlmResponse will be too. the ? is to satisfy TS
            await onLlmResponse?.(
              langChainResponseBody.data,
              langChainResponseBody.trace_data
                ? {
                    traceId: langChainResponseBody.trace_data.trace_id,
                    transactionId: langChainResponseBody.trace_data.transaction_id,
                  }
                : {}
            );
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
