/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, lastValueFrom } from 'rxjs';
import { v4 } from 'uuid';
import parse from 'joi-to-json';
import { i18n } from '@kbn/i18n';
import { schema, TypeOf } from '@kbn/config-schema';
import { Logger } from '@kbn/core/server';
import { AlertingConnectorFeatureId } from '@kbn/actions-plugin/common/connector_feature_config';
import { renderMustacheString } from '@kbn/actions-plugin/server/lib/mustache_renderer';
import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  ActionType as ConnectorType,
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
} from '@kbn/actions-plugin/server/types';
import { ParamsSchema as SlackConnectorParamsSchema } from '@kbn/stack-connectors-plugin/server/connector_types/slack';
import { ActionsClient } from '@kbn/actions-plugin/server/actions_client';
import { PublicMethodsOf } from '@kbn/utility-types';
import { concatenateChatCompletionChunks } from '../../common/utils/concatenate_chat_completion_chunks';
import type { ObservabilityAIAssistantClient } from '../service/client';
import { MessageRole } from '../../common/types';
import { ChatFunctionClient } from '../service/chat_function_client';
import {
  ChatCompletionChunkEvent,
  StreamingChatResponseEventType,
} from '../../common/conversation_complete';

const ConfigSchemaProps = {
  connector: schema.maybe(schema.string()),
};

const ConfigSchema = schema.object(ConfigSchemaProps);

const ParamsSchema = schema.object({
  message: schema.string({ minLength: 1 }),
});

export type ActionParamsType = TypeOf<typeof ParamsSchema>;

export type ObsAIAssistantConnectorType = ConnectorType<{}, {}, ActionParamsType, unknown>;

export type ObsAIAssistantConnectorTypeExecutorOptions = ConnectorTypeExecutorOptions<
  {},
  {},
  ActionParamsType
>;

export function getConnectorType({
  getObsAIClient,
}: {
  getObsAIClient: (request: KibanaRequest) => Promise<{
    client: ObservabilityAIAssistantClient | undefined;
    functionClient: ChatFunctionClient | undefined;
    actionsClient: PublicMethodsOf<ActionsClient>;
    kibanaPublicUrl?: string;
  }>;
}): ObsAIAssistantConnectorType {
  return {
    id: '.observability-ai-assistant',
    isSystemActionType: true,
    getKibanaPrivileges: (params) => [],
    minimumLicenseRequired: 'platinum',
    name: i18n.translate('xpack.observabilityAiAssistant.alertConnector.title', {
      defaultMessage: 'Observability AI Assistant',
    }),
    supportedFeatureIds: [AlertingConnectorFeatureId],
    validate: {
      config: {
        schema: ConfigSchema,
        customValidator: () => {},
      },
      params: {
        schema: ParamsSchema,
      },
      secrets: {
        schema: schema.object({ api_key: schema.maybe(schema.string()) }),
      },
    },
    renderParameterTemplates,
    executor(options) {
      return executor(options, getObsAIClient);
    },
  };
}

function renderParameterTemplates(
  logger: Logger,
  params: ActionParamsType,
  variables: Record<string, unknown>
): ActionParamsType {
  return {
    message: renderMustacheString(logger, params.message, variables, 'slack'),
  };
}

async function executor(
  execOptions: ObsAIAssistantConnectorTypeExecutorOptions,
  getObsAIClient: (request: KibanaRequest) => Promise<{
    client: ObservabilityAIAssistantClient | undefined;
    functionClient: ChatFunctionClient | undefined;
    actionsClient: PublicMethodsOf<ActionsClient>;
    kibanaPublicUrl?: string;
  }>
): Promise<ConnectorTypeExecutorResult<unknown>> {
  const { client, functionClient, actionsClient, kibanaPublicUrl } = await getObsAIClient(
    execOptions.request!
  );
  if (!client || !functionClient) {
    return { actionId: execOptions.actionId, status: 'error' };
  }
  const conversationId = v4();
  await lastValueFrom(
    client
      .complete({
        functionClient,
        conversationId,
        persist: true,
        isPrecomputedConversationId: true,
        connectorId: 'azure-open-ai',
        signal: new AbortController().signal,
        // functions: [
        //   ...connectors.map(connector => ({
        //     name: connector.name,
        //     description: 'Call connector ' + connector.name,
        //     parameters: getJsonSchemaForConnectorType(connector.type)
        //   }))
        // ],
        messages: [
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.System,
              content:
                `You are a helpful assistant for Elastic Observability.
                 An alert about a specific metric just fired. Your task is to
                 execute the workflow asked by the user. You can use the function
                 call_webhook_connector if a webhook needs to be called. When a
                 webhook is called, include what url was called in your response.` +
                (kibanaPublicUrl
                  ? ` A link to this
                  conversation should be added at the bottom of the report, the conversation
                  url is ${
                    kibanaPublicUrl! +
                    `/app/observabilityAIAssistant/conversations/${conversationId}`
                  }.`
                  : ''),
            },
          },
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.User,
              content: execOptions.params.message,
            },
          },
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.Assistant,
              content: '',
              function_call: {
                name: 'get_connectors',
                arguments: JSON.stringify({}),
                trigger: MessageRole.Assistant as const,
              },
            },
          },
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.User,
              name: 'get_connectors',
              content: JSON.stringify({
                connectors: await actionsClient.getAll().then((connectors) => {
                  return connectors.map((connector) => {
                    // getParamsForConnector(connector.actionTypeId);
                    if (connector.actionTypeId === '.slack') {
                      return {
                        ...connector,
                        params: parse(SlackConnectorParamsSchema.getSchema(), 'json').properties,
                      };
                    }
                    return connector;
                  });
                }),
              }),
            },
          },
        ],
      })
      .pipe(
        filter(
          (event): event is ChatCompletionChunkEvent =>
            event.type === StreamingChatResponseEventType.ChatCompletionChunk
        )
      )
      .pipe(concatenateChatCompletionChunks())
  );

  return { actionId: execOptions.actionId, status: 'ok' };
}
