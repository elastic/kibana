/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AnalyticsServiceSetup,
  AuthenticatedUser,
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
} from '@kbn/core/server';
import { StreamResponseWithHeaders } from '@kbn/ml-response-stream/server';

import {
  TraceData,
  ConversationResponse,
  ExecuteConnectorRequestBody,
  Message,
  Replacements,
  replaceAnonymizedValuesWithOriginalValues,
} from '@kbn/elastic-assistant-common';
import { ILicense } from '@kbn/licensing-plugin/server';
import { i18n } from '@kbn/i18n';
import { PublicMethodsOf } from '@kbn/utility-types';
import { ActionsClient } from '@kbn/actions-plugin/server';
import { MINIMUM_AI_ASSISTANT_LICENSE } from '../../common/constants';
import { ESQL_RESOURCE, KNOWLEDGE_BASE_INDEX_PATTERN } from './knowledge_base/constants';
import { callAgentExecutor } from '../lib/langchain/execute_custom_llm_chain';
import { getLlmType } from './utils';
import { StaticReturnType } from '../lib/langchain/executors/types';
import { executeAction, StaticResponse } from '../lib/executor';
import { getLangChainMessages } from '../lib/langchain/helpers';

import { getLangSmithTracer } from './evaluate/utils';
import { EsAnonymizationFieldsSchema } from '../ai_assistant_data_clients/anonymization_fields/types';
import { transformESSearchToAnonymizationFields } from '../ai_assistant_data_clients/anonymization_fields/helpers';
import { ElasticsearchStore } from '../lib/langchain/elasticsearch_store/elasticsearch_store';
import { AIAssistantConversationsDataClient } from '../ai_assistant_data_clients/conversations';
import { INVOKE_ASSISTANT_SUCCESS_EVENT } from '../lib/telemetry/event_based_telemetry';
import {
  ElasticAssistantApiRequestHandlerContext,
  ElasticAssistantRequestHandlerContext,
  GetElser,
} from '../types';
import { callAssistantGraph } from '../lib/langchain/graphs/default_assistant_graph';

interface GetPluginNameFromRequestParams {
  request: KibanaRequest;
  defaultPluginName: string;
  logger?: Logger;
}

export const DEFAULT_PLUGIN_NAME = 'securitySolutionUI';

export const NEW_CHAT = i18n.translate('xpack.elasticAssistantPlugin.server.newChat', {
  defaultMessage: 'New chat',
});

/**
 * Attempts to extract the plugin name the request originated from using the request headers.
 *
 * Note from Kibana Core: This is not a 100% fit solution, though, because plugins can run in the background,
 * or even use other plugins’ helpers (ie, APM can use the infra helpers to call a third plugin)
 *
 * Should suffice for our purposes here with where the Elastic Assistant is currently used, but if needing a
 * dedicated solution, the core folks said to reach out.
 *
 * @param logger optional logger to log any errors
 * @param defaultPluginName default plugin name to use if unable to determine from request
 * @param request Kibana Request
 *
 * @returns plugin name
 */
export const getPluginNameFromRequest = ({
  logger,
  defaultPluginName,
  request,
}: GetPluginNameFromRequestParams): string => {
  try {
    const contextHeader = request.headers['x-kbn-context'];
    if (contextHeader != null) {
      return JSON.parse(
        decodeURIComponent(Array.isArray(contextHeader) ? contextHeader[0] : contextHeader)
      )?.name;
    }
  } catch (err) {
    logger?.error(
      `Error determining source plugin for selecting tools, using ${defaultPluginName}.`
    );
  }
  return defaultPluginName;
};

export const getMessageFromRawResponse = ({
  rawContent,
  isError,
  traceData,
}: {
  rawContent?: string;
  traceData?: TraceData;
  isError?: boolean;
}): Message => {
  const dateTimeString = new Date().toISOString();
  if (rawContent) {
    return {
      role: 'assistant',
      content: rawContent,
      timestamp: dateTimeString,
      isError,
      traceData,
    };
  } else {
    return {
      role: 'assistant',
      content: 'Error: Response from LLM API is empty or undefined.',
      timestamp: dateTimeString,
      isError: true,
    };
  }
};

export const hasAIAssistantLicense = (license: ILicense): boolean =>
  license.hasAtLeast(MINIMUM_AI_ASSISTANT_LICENSE);

export const UPGRADE_LICENSE_MESSAGE =
  'Your license does not support AI Assistant. Please upgrade your license.';

export interface GenerateTitleForNewChatConversationParams {
  message: Pick<Message, 'content' | 'role'>;
  model?: string;
  actionTypeId: string;
  connectorId: string;
  logger: Logger;
  actionsClient: PublicMethodsOf<ActionsClient>;
  responseLanguage?: string;
}
export const generateTitleForNewChatConversation = async ({
  message,
  model,
  actionTypeId,
  connectorId,
  logger,
  actionsClient,
  responseLanguage = 'English',
}: GenerateTitleForNewChatConversationParams) => {
  try {
    const autoTitle = (await executeAction({
      actionsClient,
      connectorId,
      actionTypeId,
      params: {
        subAction: 'invokeAI',
        subActionParams: {
          model,
          messages: [
            {
              role: 'system',
              content: `You are a helpful assistant for Elastic Security. Assume the following message is the start of a conversation between you and a user; give this conversation a title based on the content below. DO NOT UNDER ANY CIRCUMSTANCES wrap this title in single or double quotes. This title is shown in a list of conversations to the user, so title it for the user, not for you. Please create the title in ${responseLanguage}.`,
            },
            {
              role: message.role,
              content: message.content,
            },
          ],
          ...(actionTypeId === '.gen-ai'
            ? { n: 1, stop: null, temperature: 0.2 }
            : { temperature: 0, stopSequences: [] }),
        },
      },
      logger,
    })) as unknown as StaticResponse; // TODO: Use function overloads in executeAction to avoid this cast when sending subAction: 'invokeAI',
    if (autoTitle.status === 'ok') {
      // This regular expression captures a string enclosed in single or double quotes.
      // It extracts the string content without the quotes.
      // Example matches:
      // - "Hello, World!" => Captures: Hello, World!
      // - 'Another Example' => Captures: Another Example
      // - JustTextWithoutQuotes => Captures: JustTextWithoutQuotes
      const match = autoTitle.data.match(/^["']?([^"']+)["']?$/);
      const title = match ? match[1] : autoTitle.data;
      return title;
    }
  } catch (e) {
    /* empty */
  }
};

export interface AppendMessageToConversationParams {
  conversationsDataClient: AIAssistantConversationsDataClient;
  messages: Array<Pick<Message, 'content' | 'role' | 'timestamp'>>;
  replacements: Replacements;
  conversation: ConversationResponse;
}
export const appendMessageToConversation = async ({
  conversationsDataClient,
  messages,
  replacements,
  conversation,
}: AppendMessageToConversationParams) => {
  const updatedConversation = await conversationsDataClient?.appendConversationMessages({
    existingConversation: conversation,
    messages: messages.map((m) => ({
      ...{
        content: replaceAnonymizedValuesWithOriginalValues({
          messageContent: m.content,
          replacements,
        }),
        role: m.role ?? 'user',
      },
      timestamp: m.timestamp ?? new Date().toISOString(),
    })),
  });
  return updatedConversation;
};

export interface AppendAssistantMessageToConversationParams {
  conversationsDataClient: AIAssistantConversationsDataClient;
  messageContent: string;
  replacements: Replacements;
  conversation: ConversationResponse;
  isError?: boolean;
  traceData?: Message['traceData'];
}
export const appendAssistantMessageToConversation = async ({
  conversationsDataClient,
  messageContent,
  replacements,
  conversation,
  isError = false,
  traceData = {},
}: AppendAssistantMessageToConversationParams) => {
  await conversationsDataClient?.appendConversationMessages({
    existingConversation: conversation,
    messages: [
      getMessageFromRawResponse({
        rawContent: replaceAnonymizedValuesWithOriginalValues({
          messageContent,
          replacements,
        }),
        traceData,
        isError,
      }),
    ],
  });
  if (Object.keys(replacements).length > 0) {
    await conversationsDataClient?.updateConversation({
      conversationUpdateProps: {
        id: conversation.id,
        replacements,
      },
    });
  }
};

export interface NonLangChainExecuteParams {
  request: KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;
  messages: Array<Pick<Message, 'content' | 'role'>>;
  abortSignal: AbortSignal;
  actionTypeId: string;
  connectorId: string;
  logger: Logger;
  actionsClient: PublicMethodsOf<ActionsClient>;
  onLlmResponse?: (
    content: string,
    traceData?: Message['traceData'],
    isError?: boolean
  ) => Promise<void>;
  response: KibanaResponseFactory;
  telemetry: AnalyticsServiceSetup;
}
export const nonLangChainExecute = async ({
  messages,
  abortSignal,
  actionTypeId,
  connectorId,
  logger,
  actionsClient,
  onLlmResponse,
  response,
  request,
  telemetry,
}: NonLangChainExecuteParams) => {
  logger.debug('Executing via actions framework directly');
  const result = await executeAction({
    abortSignal,
    onLlmResponse,
    actionsClient,
    connectorId,
    actionTypeId,
    params: {
      subAction: request.body.subAction,
      subActionParams: {
        model: request.body.model,
        messages,
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
};

export interface LangChainExecuteParams {
  messages: Array<Pick<Message, 'content' | 'role'>>;
  replacements: Replacements;
  onNewReplacements: (newReplacements: Replacements) => void;
  abortSignal: AbortSignal;
  telemetry: AnalyticsServiceSetup;
  actionTypeId: string;
  connectorId: string;
  assistantContext: ElasticAssistantApiRequestHandlerContext;
  context: ElasticAssistantRequestHandlerContext;
  actionsClient: PublicMethodsOf<ActionsClient>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  request: KibanaRequest<unknown, unknown, any>;
  logger: Logger;
  onLlmResponse?: (
    content: string,
    traceData?: Message['traceData'],
    isError?: boolean
  ) => Promise<void>;
  getElser: GetElser;
  response: KibanaResponseFactory;
}
export const langChainExecute = async ({
  messages,
  replacements,
  onNewReplacements,
  abortSignal,
  telemetry,
  actionTypeId,
  connectorId,
  assistantContext,
  context,
  actionsClient,
  request,
  logger,
  onLlmResponse,
  getElser,
  response,
}: LangChainExecuteParams) => {
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
  const assistantTools = assistantContext
    .getRegisteredTools(pluginName)
    .filter((x) => x.id !== 'attack-discovery'); // We don't (yet) support asking the assistant for NEW attack discoveries from a conversation

  // get a scoped esClient for assistant memory
  const esClient = (await context.core).elasticsearch.client.asCurrentUser;

  // convert the assistant messages to LangChain messages:
  const langChainMessages = getLangChainMessages(messages);

  const elserId = await getElser();

  const anonymizationFieldsDataClient =
    await assistantContext.getAIAssistantAnonymizationFieldsDataClient();
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

  const executorParams = {
    abortSignal,
    alertsIndexPattern: request.body.alertsIndexPattern,
    anonymizationFields: anonymizationFieldsRes
      ? transformESSearchToAnonymizationFields(anonymizationFieldsRes.data)
      : undefined,
    actionsClient,
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
    replacements,
    size: request.body.size,
    traceOptions: {
      projectName: request.body.langSmithProject,
      tracers: getLangSmithTracer({
        apiKey: request.body.langSmithApiKey,
        projectName: request.body.langSmithProject,
        logger,
      }),
    },
  };

  // New code path for LangGraph implementation, behind `assistantKnowledgeBaseByDefault` FF
  let result: StreamResponseWithHeaders | StaticReturnType;
  if (enableKnowledgeBaseByDefault) {
    result = await callAssistantGraph(executorParams);
  } else {
    result = await callAgentExecutor(executorParams);
  }


  telemetry.reportEvent(INVOKE_ASSISTANT_SUCCESS_EVENT.eventType, {
    actionTypeId,
    isEnabledKnowledgeBase: request.body.isEnabledKnowledgeBase,
    isEnabledRAGAlerts: request.body.isEnabledRAGAlerts,
    model: request.body.model,
    // TODO rm actionTypeId check when llmClass for bedrock streaming is implemented
    // tracked here: https://github.com/elastic/security-team/issues/7363
    assistantStreamingEnabled: request.body.subAction !== 'invokeAI' && actionTypeId === '.gen-ai',
  });

  return response.ok<StreamResponseWithHeaders['body'] | StaticReturnType['body']>(result);
};

export interface CreateOrUpdateConversationWithParams {
  logger: Logger;
  conversationsDataClient: AIAssistantConversationsDataClient;
  replacements: Replacements;
  conversationId?: string;
  promptId?: string;
  actionTypeId: string;
  connectorId: string;
  actionsClient: PublicMethodsOf<ActionsClient>;
  newMessages?: Array<Pick<Message, 'content' | 'role' | 'timestamp'>>;
  model?: string;
  authenticatedUser: AuthenticatedUser;
  responseLanguage?: string;
}
export const createOrUpdateConversationWithUserInput = async ({
  logger,
  conversationsDataClient,
  replacements,
  conversationId,
  actionTypeId,
  promptId,
  connectorId,
  actionsClient,
  newMessages,
  model,
  authenticatedUser,
  responseLanguage,
}: CreateOrUpdateConversationWithParams) => {
  if (!conversationId) {
    if (newMessages && newMessages.length > 0) {
      const title = await generateTitleForNewChatConversation({
        message: newMessages[0],
        actionsClient,
        actionTypeId,
        connectorId,
        logger,
        model,
        responseLanguage,
      });
      if (title) {
        return conversationsDataClient.createConversation({
          conversation: {
            title,
            messages: newMessages,
            replacements,
            apiConfig: {
              connectorId,
              actionTypeId,
              model,
              defaultSystemPromptId: promptId,
            },
          },
          authenticatedUser,
        });
      }
    }
    return;
  }
  return updateConversationWithUserInput({
    actionsClient,
    actionTypeId,
    authenticatedUser,
    connectorId,
    conversationId,
    conversationsDataClient,
    logger,
    replacements,
    newMessages,
    model,
  });
};

export interface UpdateConversationWithParams {
  logger: Logger;
  conversationsDataClient: AIAssistantConversationsDataClient;
  replacements: Replacements;
  conversationId: string;
  actionTypeId: string;
  connectorId: string;
  actionsClient: PublicMethodsOf<ActionsClient>;
  newMessages?: Array<Pick<Message, 'content' | 'role' | 'timestamp'>>;
  model?: string;
  authenticatedUser: AuthenticatedUser;
  responseLanguage?: string;
}
export const updateConversationWithUserInput = async ({
  logger,
  conversationsDataClient,
  replacements,
  conversationId,
  actionTypeId,
  connectorId,
  actionsClient,
  newMessages,
  model,
  authenticatedUser,
  responseLanguage,
}: UpdateConversationWithParams) => {
  if (!conversationId) {
    if (newMessages && newMessages.length > 0) {
      const title = await generateTitleForNewChatConversation({
        message: newMessages[0],
        actionsClient,
        actionTypeId,
        connectorId,
        logger,
        responseLanguage,
        model,
      });
      if (title) {
        return conversationsDataClient.createConversation({
          conversation: {
            title,
            messages: newMessages,
            replacements,
          },
          authenticatedUser,
        });
      }
    }
    return;
  }
  const conversation = await conversationsDataClient?.getConversation({
    id: conversationId,
    authenticatedUser,
  });
  if (conversation == null) {
    throw new Error(`conversation id: "${conversationId}" not found`);
  }
  let updatedConversation = conversation;

  const messages = updatedConversation?.messages?.map((c) => ({
    role: c.role,
    content: c.content,
    timestamp: c.timestamp,
  }));

  const lastMessage = newMessages?.[0] ?? messages?.[0];
  console.log(conversation?.title)
  console.log(lastMessage)

  if (conversation?.title === NEW_CHAT && lastMessage) {
    const title = await generateTitleForNewChatConversation({
      message: lastMessage,
      actionsClient,
      actionTypeId,
      connectorId,
      logger,
      model,
    });
    const res = await conversationsDataClient.updateConversation({
      conversationUpdateProps: {
        id: conversationId,
        title,
      },
    });
    if (res) {
      updatedConversation = res;
    }
  }

  if (newMessages) {
    return appendMessageToConversation({
      conversation: updatedConversation,
      conversationsDataClient,
      messages: newMessages,
      replacements,
    });
  }
  return updatedConversation;
};
