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
  transformRawData,
  getAnonymizedValue,
  ConversationResponse,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import { INVOKE_ASSISTANT_ERROR_EVENT } from '../../lib/telemetry/event_based_telemetry';
import { ElasticAssistantPluginRouter, GetElser } from '../../types';
import { buildResponse } from '../../lib/build_response';
import {
  DEFAULT_PLUGIN_NAME,
  appendAssistantMessageToConversation,
  createOrUpdateConversationWithUserInput,
  getPluginNameFromRequest,
  langChainExecute,
  performChecks,
} from '../helpers';
import { transformESSearchToAnonymizationFields } from '../../ai_assistant_data_clients/anonymization_fields/helpers';
import { EsAnonymizationFieldsSchema } from '../../ai_assistant_data_clients/anonymization_fields/types';

export const SYSTEM_PROMPT_CONTEXT_NON_I18N = (context: string) => {
  return `CONTEXT:\n"""\n${context}\n"""`;
};

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
        let telemetry;
        let actionTypeId;
        try {
          const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
          const logger: Logger = ctx.elasticAssistant.logger;
          telemetry = ctx.elasticAssistant.telemetry;

          // Perform license and authenticated user checks
          const checkResponse = performChecks({
            authenticatedUser: true,
            context: ctx,
            license: true,
            request,
            response,
          });
          if (checkResponse) {
            return checkResponse;
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
          const actions = ctx.elasticAssistant.actions;
          const actionsClient = await actions.getActionsClientWithRequest(request);
          const connectors = await actionsClient.getBulk({ ids: [connectorId] });
          actionTypeId = connectors.length > 0 ? connectors[0].actionTypeId : '.gen-ai';

          // replacements
          const anonymizationFieldsRes =
            await anonymizationFieldsDataClient?.findDocuments<EsAnonymizationFieldsSchema>({
              perPage: 1000,
              page: 1,
            });

          let anonymizationFields = anonymizationFieldsRes
            ? transformESSearchToAnonymizationFields(anonymizationFieldsRes.data)
            : undefined;

          // anonymize messages before sending to LLM
          messages = request.body.messages.map((m) => {
            let content = m.content ?? '';
            if (m.data) {
              // includes/anonymize fields from the messages data
              if (m.fields_to_anonymize && m.fields_to_anonymize.length > 0) {
                anonymizationFields = anonymizationFields?.map((a) => {
                  if (m.fields_to_anonymize?.includes(a.field)) {
                    return {
                      ...a,
                      allowed: true,
                      anonymized: true,
                    };
                  }
                  return a;
                });
              }
              const anonymizedData = transformRawData({
                anonymizationFields,
                currentReplacements: latestReplacements,
                getAnonymizedValue,
                onNewReplacements,
                rawData: Object.keys(m.data).reduce(
                  (obj, key) => ({ ...obj, [key]: [m.data ? m.data[key] : ''] }),
                  {}
                ),
              });
              const wr = `${SYSTEM_PROMPT_CONTEXT_NON_I18N(anonymizedData)}\n`;
              content = `${wr}\n${m.content}`;
            }
            const transformedMessage = {
              role: m.role,
              content,
            };
            return transformedMessage;
          });

          let updatedConversation: ConversationResponse | undefined | null;
          // Fetch any tools registered by the request's originating plugin
          const pluginName = getPluginNameFromRequest({
            request,
            defaultPluginName: DEFAULT_PLUGIN_NAME,
            logger,
          });
          const enableKnowledgeBaseByDefault =
            ctx.elasticAssistant.getRegisteredFeatures(pluginName).assistantKnowledgeBaseByDefault;
          // TODO: remove non-graph persistance when KB will be enabled by default
          if (
            (!enableKnowledgeBaseByDefault || (enableKnowledgeBaseByDefault && !conversationId)) &&
            request.body.persist &&
            conversationsDataClient
          ) {
            updatedConversation = await createOrUpdateConversationWithUserInput({
              actionsClient,
              actionTypeId,
              connectorId,
              conversationId,
              conversationsDataClient,
              promptId: request.body.promptId,
              logger,
              replacements: latestReplacements,
              newMessages: messages,
              model: request.body.model,
            });
            if (updatedConversation == null) {
              return assistantResponse.error({
                body: `conversation id: "${conversationId}" not updated`,
                statusCode: 400,
              });
            }
            // messages are anonymized by conversationsDataClient
            messages = updatedConversation?.messages?.map((c) => ({
              role: c.role,
              content: c.content,
            }));
          }

          const onLlmResponse = async (
            content: string,
            traceData: Message['traceData'] = {},
            isError = false
          ): Promise<void> => {
            if (updatedConversation?.id && conversationsDataClient) {
              await appendAssistantMessageToConversation({
                conversationId: updatedConversation?.id,
                conversationsDataClient,
                messageContent: content,
                replacements: latestReplacements,
                isError,
                traceData,
              });
            }
          };

          return await langChainExecute({
            abortSignal,
            isEnabledKnowledgeBase: true,
            isStream: request.body.isStream ?? false,
            actionsClient,
            actionTypeId,
            connectorId,
            conversationId,
            context: ctx,
            getElser,
            logger,
            messages: messages ?? [],
            onLlmResponse,
            onNewReplacements,
            replacements: latestReplacements,
            request,
            response,
            telemetry,
            responseLanguage: request.body.responseLanguage,
          });
        } catch (err) {
          const error = transformError(err as Error);
          telemetry?.reportEvent(INVOKE_ASSISTANT_ERROR_EVENT.eventType, {
            actionTypeId: actionTypeId ?? '',
            isEnabledKnowledgeBase: true,
            isEnabledRAGAlerts: true,
            model: request.body.model,
            errorMessage: error.message,
            // TODO rm actionTypeId check when llmClass for bedrock streaming is implemented
            // tracked here: https://github.com/elastic/security-team/issues/7363
            assistantStreamingEnabled: request.body.isStream ?? false,
          });
          return assistantResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
