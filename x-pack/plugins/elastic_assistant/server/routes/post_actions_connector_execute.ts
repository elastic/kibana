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
  getAnonymizedValue,
  transformRawData,
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

export const SYSTEM_PROMPT_CONTEXT_NON_I18N = (context: string) => {
  return `CONTEXT:\n"""\n${context}\n"""`;
};

export const getMessageContentWithReplacements = ({
  messageContent,
  replacements,
}: {
  messageContent: string;
  replacements: Record<string, string> | undefined;
}): string =>
  replacements != null
    ? Object.keys(replacements).reduce(
        (acc, replacement) => acc.replaceAll(replacement, replacements[replacement]),
        messageContent
      )
    : messageContent;

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
          const conversation = await dataClient?.getConversation({
            id: request.body.conversationId,
            authenticatedUser,
          });

          if (conversation == null) {
            return response.notFound({
              body: `conversation id: "${request.body.conversationId}" not found`,
            });
          }

          let replacements: Record<string, string> | undefined;
          const onNewReplacementsFunc = async (newReplacements: Record<string, string>) => {
            const res = await dataClient?.updateConversation({
              existingConversation: conversation,
              conversationUpdateProps: {
                id: request.body.conversationId,
                replacements: newReplacements,
              },
            });
            replacements = res?.replacements as Record<string, string> | undefined;
            return res?.replacements as Record<string, string> | undefined;
          };

          const promptContext = await transformRawData({
            allow: request.body.params.subActionParams.messages[0].allow ?? [],
            allowReplacement:
              request.body.params.subActionParams.messages[0].allowReplacement ?? [],
            currentReplacements: conversation.replacements as Record<string, string> | undefined,
            getAnonymizedValue,
            onNewReplacements: onNewReplacementsFunc,
            rawData: request.body.params.subActionParams.messages[0].rawData as Record<
              string,
              unknown[]
            >,
          });

          const messageContentWithReplacements = `${SYSTEM_PROMPT_CONTEXT_NON_I18N(promptContext)}`;

          const anonymizedContent = `${request.body.params.subActionParams.messages[0].content}${messageContentWithReplacements}

            ${request.body.params.subActionParams.messages[0].promptText}`;

          const dateTimeString = new Date().toLocaleString();
          const updatedConversation = await dataClient?.appendConversationMessages({
            existingConversation: conversation,
            messages: request.body.params.subActionParams.messages.map((m) => ({
              content: getMessageContentWithReplacements({
                messageContent: anonymizedContent,
                replacements,
              }),
              role: m.role,
              timestamp: dateTimeString,
            })),
          });
          if (updatedConversation == null) {
            return response.badRequest({
              body: `conversation id: "${request.body.conversationId}" not updated`,
            });
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
              onMessageSent: (content) => {
                dataClient?.appendConversationMessages({
                  existingConversation: updatedConversation,
                  messages: [
                    getMessageFromRawResponse({
                      rawContent: getMessageContentWithReplacements({
                        messageContent: content,
                        replacements,
                      }),
                    }),
                  ],
                });
              },
              actions,
              request,
              connectorId,
              params: {
                subAction: request.body.params.subAction,
                subActionParams: {
                  ...request.body.params.subActionParams,
                  messages: [
                    ...(conversation.messages?.map((c) => ({
                      role: c.role,
                      content: c.content,
                    })) ?? []),
                    {
                      role: request.body.params.subActionParams.messages[0].role,
                      content: anonymizedContent,
                    },
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
            ([
              ...(conversation.messages?.map((c) => ({
                role: c.role,
                content: c.content,
              })) ?? []),
              {
                role: request.body.params.subActionParams.messages[0].role,
                content: anonymizedContent,
              },
            ] ?? []) as unknown as Array<Pick<Message, 'content' | 'role'>>
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
