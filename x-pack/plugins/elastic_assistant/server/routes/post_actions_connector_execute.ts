/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import { StreamResponseWithHeaders } from '@kbn/ml-response-stream/server';

import { schema } from '@kbn/config-schema';
import {
  API_VERSIONS,
  ExecuteConnectorRequestBody,
  Message,
  Replacements,
  replaceAnonymizedValuesWithOriginalValues,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { i18n } from '@kbn/i18n';
import { getLlmType } from './utils';
import { StaticReturnType } from '../lib/langchain/executors/types';
import {
  INVOKE_ASSISTANT_ERROR_EVENT,
  INVOKE_ASSISTANT_SUCCESS_EVENT,
} from '../lib/telemetry/event_based_telemetry';
import { executeAction, StaticResponse } from '../lib/executor';
import { POST_ACTIONS_CONNECTOR_EXECUTE } from '../../common/constants';
import { getLangChainMessages } from '../lib/langchain/helpers';
import { buildResponse } from '../lib/build_response';
import { ElasticAssistantRequestHandlerContext, GetElser } from '../types';
import { ESQL_RESOURCE, KNOWLEDGE_BASE_INDEX_PATTERN } from './knowledge_base/constants';
import { callAgentExecutor } from '../lib/langchain/execute_custom_llm_chain';
import {
  DEFAULT_PLUGIN_NAME,
  getMessageFromRawResponse,
  getPluginNameFromRequest,
} from './helpers';
import { getLangSmithTracer } from './evaluate/utils';
import { EsAnonymizationFieldsSchema } from '../ai_assistant_data_clients/anonymization_fields/types';
import { transformESSearchToAnonymizationFields } from '../ai_assistant_data_clients/anonymization_fields/helpers';
import { ElasticsearchStore } from '../lib/langchain/elasticsearch_store/elasticsearch_store';

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
        const assistantContext = await context.elasticAssistant;
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
          const conversationsDataClient =
            await assistantContext.getAIAssistantConversationsDataClient();

          const anonymizationFieldsDataClient =
            await assistantContext.getAIAssistantAnonymizationFieldsDataClient();

          let latestReplacements: Replacements = request.body.replacements;
          const onNewReplacements = (newReplacements: Replacements) => {
            latestReplacements = { ...latestReplacements, ...newReplacements };
          };

          let prevMessages;
          let newMessage: Pick<Message, 'content' | 'role'> | undefined;
          const conversationId = request.body.conversationId;
          const actionTypeId = request.body.actionTypeId;
          const langSmithProject = request.body.langSmithProject;
          const langSmithApiKey = request.body.langSmithApiKey;

          // if message is undefined, it means the user is regenerating a message from the stored conversation
          if (request.body.message) {
            newMessage = {
              content: request.body.message,
              role: 'user',
            };
          }

          const connectorId = decodeURIComponent(request.params.connectorId);

          // get the actions plugin start contract from the request context:
          const actions = (await context.elasticAssistant).actions;

          if (conversationId) {
            const conversation = await conversationsDataClient?.getConversation({
              id: conversationId,
              authenticatedUser,
            });
            if (conversation == null) {
              return response.notFound({
                body: `conversation id: "${conversationId}" not found`,
              });
            }

            // messages are anonymized by conversationsDataClient
            prevMessages = conversation?.messages?.map((c) => ({
              role: c.role,
              content: c.content,
            }));

            if (request.body.message) {
              const res = await conversationsDataClient?.appendConversationMessages({
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
            const updatedConversation = await conversationsDataClient?.getConversation({
              id: conversationId,
              authenticatedUser,
            });

            if (updatedConversation == null) {
              return response.notFound({
                body: `conversation id: "${conversationId}" not found`,
              });
            }

            const NEW_CHAT = i18n.translate('xpack.elasticAssistantPlugin.server.newChat', {
              defaultMessage: 'New chat',
            });
            if (conversation?.title === NEW_CHAT && prevMessages) {
              try {
                const autoTitle = (await executeAction({
                  actions,
                  request,
                  connectorId,
                  actionTypeId,
                  params: {
                    subAction: 'invokeAI',
                    subActionParams: {
                      model: request.body.model,
                      messages: [
                        {
                          role: 'system',
                          content: i18n.translate(
                            'xpack.elasticAssistantPlugin.server.autoTitlePromptDescription',
                            {
                              defaultMessage:
                                'You are a helpful assistant for Elastic Security. Assume the following message is the start of a conversation between you and a user; give this conversation a title based on the content below. DO NOT UNDER ANY CIRCUMSTANCES wrap this title in single or double quotes. This title is shown in a list of conversations to the user, so title it for the user, not for you.',
                            }
                          ),
                        },
                        newMessage ?? prevMessages?.[0],
                      ],
                      ...(actionTypeId === '.gen-ai'
                        ? { n: 1, stop: null, temperature: 0.2 }
                        : { temperature: 0, stopSequences: [] }),
                    },
                  },
                  logger,
                })) as unknown as StaticResponse; // TODO: Use function overloads in executeAction to avoid this cast when sending subAction: 'invokeAI',
                if (autoTitle.status === 'ok') {
                  try {
                    // This regular expression captures a string enclosed in single or double quotes.
                    // It extracts the string content without the quotes.
                    // Example matches:
                    // - "Hello, World!" => Captures: Hello, World!
                    // - 'Another Example' => Captures: Another Example
                    // - JustTextWithoutQuotes => Captures: JustTextWithoutQuotes
                    const match = autoTitle.data.match(/^["']?([^"']+)["']?$/);
                    const title = match ? match[1] : autoTitle.data;

                    await conversationsDataClient?.updateConversation({
                      conversationUpdateProps: {
                        id: conversationId,
                        title,
                      },
                    });
                  } catch (e) {
                    logger.warn(`Failed to update conversation with generated title: ${e.message}`);
                  }
                }
              } catch (e) {
                /* empty */
              }
            }

            onLlmResponse = async (
              content: string,
              traceData: Message['traceData'] = {},
              isError = false
            ): Promise<void> => {
              if (updatedConversation) {
                await conversationsDataClient?.appendConversationMessages({
                  existingConversation: updatedConversation,
                  messages: [
                    getMessageFromRawResponse({
                      rawContent: replaceAnonymizedValuesWithOriginalValues({
                        messageContent: content,
                        replacements: latestReplacements,
                      }),
                      traceData,
                      isError,
                    }),
                  ],
                });
              }
              if (Object.keys(latestReplacements).length > 0) {
                await conversationsDataClient?.updateConversation({
                  conversationUpdateProps: {
                    id: conversationId,
                    replacements: latestReplacements,
                  },
                });
              }
            };
          }

          // if not langchain, call execute action directly and return the response:
          if (!request.body.isEnabledKnowledgeBase && !request.body.isEnabledRAGAlerts) {
            logger.debug('Executing via actions framework directly');

            const result = await executeAction({
              abortSignal,
              onLlmResponse,
              actions,
              request,
              connectorId,
              actionTypeId,
              params: {
                subAction: request.body.subAction,
                subActionParams: {
                  model: request.body.model,
                  messages: [...(prevMessages ?? []), ...(newMessage ? [newMessage] : [])],
                  ...(actionTypeId === '.gen-ai'
                    ? { n: 1, stop: null, temperature: 0.2 }
                    : { temperature: 0, stopSequences: [] }),
                },
              },
              logger,
            });

            telemetry.reportEvent(INVOKE_ASSISTANT_SUCCESS_EVENT.eventType, {
              actionTypeId,
              isEnabledKnowledgeBase: request.body.isEnabledKnowledgeBase,
              isEnabledRAGAlerts: request.body.isEnabledRAGAlerts,
              model: request.body.model,
              assistantStreamingEnabled: request.body.subAction !== 'invokeAI',
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
          const assistantTools = (await context.elasticAssistant)
            .getRegisteredTools(pluginName)
            .filter((x) => x.id !== 'attack-discovery'); // We don't (yet) support asking the assistant for NEW attack discoveries from a conversation

          // get a scoped esClient for assistant memory
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;

          // convert the assistant messages to LangChain messages:
          const langChainMessages = getLangChainMessages(
            ([...(prevMessages ?? []), ...(newMessage ? [newMessage] : [])] ??
              []) as unknown as Array<Pick<Message, 'content' | 'role'>>
          );

          const elserId = await getElser();

          const anonymizationFieldsRes =
            await anonymizationFieldsDataClient?.findDocuments<EsAnonymizationFieldsSchema>({
              perPage: 1000,
              page: 1,
            });

          // Create an ElasticsearchStore for KB interactions
          // Setup with kbDataClient if `enableKnowledgeBaseByDefault` FF is enabled
          const enableKnowledgeBaseByDefault =
            assistantContext.getRegisteredFeatures(pluginName).assistantKnowledgeBaseByDefault;
          const kbDataClient = enableKnowledgeBaseByDefault
            ? (await assistantContext.getAIAssistantKnowledgeBaseDataClient(false)) ?? undefined
            : undefined;
          const kbIndex =
            enableKnowledgeBaseByDefault && kbDataClient != null
              ? kbDataClient.indexTemplateAndPattern.alias
              : KNOWLEDGE_BASE_INDEX_PATTERN;
          const esStore = new ElasticsearchStore(
            esClient,
            kbIndex,
            logger,
            telemetry,
            elserId,
            ESQL_RESOURCE,
            kbDataClient
          );

          const result: StreamResponseWithHeaders | StaticReturnType = await callAgentExecutor({
            abortSignal,
            alertsIndexPattern: request.body.alertsIndexPattern,
            anonymizationFields: anonymizationFieldsRes
              ? transformESSearchToAnonymizationFields(anonymizationFieldsRes.data)
              : undefined,
            actions,
            isEnabledKnowledgeBase: request.body.isEnabledKnowledgeBase ?? false,
            assistantTools,
            connectorId,
            esClient,
            esStore,
            isStream: request.body.subAction !== 'invokeAI',
            llmType: getLlmType(actionTypeId),
            langChainMessages,
            logger,
            onNewReplacements,
            onLlmResponse,
            request,
            replacements: request.body.replacements,
            size: request.body.size,
            traceOptions: {
              projectName: langSmithProject,
              tracers: getLangSmithTracer({
                apiKey: langSmithApiKey,
                projectName: langSmithProject,
                logger,
              }),
            },
          });

          telemetry.reportEvent(INVOKE_ASSISTANT_SUCCESS_EVENT.eventType, {
            actionTypeId,
            isEnabledKnowledgeBase: request.body.isEnabledKnowledgeBase,
            isEnabledRAGAlerts: request.body.isEnabledRAGAlerts,
            model: request.body.model,
            // TODO rm actionTypeId check when llmClass for bedrock streaming is implemented
            // tracked here: https://github.com/elastic/security-team/issues/7363
            assistantStreamingEnabled:
              request.body.subAction !== 'invokeAI' && actionTypeId === '.gen-ai',
          });

          return response.ok<StreamResponseWithHeaders['body'] | StaticReturnType['body']>(result);
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
