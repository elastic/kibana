/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, lastValueFrom } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { schema, TypeOf } from '@kbn/config-schema';
import { KibanaRequest, Logger } from '@kbn/core/server';
import { AlertingConnectorFeatureId } from '@kbn/actions-plugin/common/connector_feature_config';
import { renderMustacheString } from '@kbn/actions-plugin/server/lib/mustache_renderer';
import type {
  ActionType as ConnectorType,
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
} from '@kbn/actions-plugin/server/types';
import { ConnectorAdapter } from '@kbn/alerting-plugin/server';
import { ObservabilityAIAssistantRouteHandlerResources } from '../routes/types';
import {
  ChatCompletionChunkEvent,
  MessageRole,
  StreamingChatResponseEventType,
} from '../../common';
import { concatenateChatCompletionChunks } from '../../common/utils/concatenate_chat_completion_chunks';

const ParamsSchema = schema.object({
  connector: schema.string(),
  message: schema.string({ minLength: 1 }),
});

export type ActionParamsType = TypeOf<typeof ParamsSchema>;

export type ObsAIAssistantConnectorType = ConnectorType<{}, {}, ActionParamsType, unknown>;

export type ObsAIAssistantConnectorTypeExecutorOptions = ConnectorTypeExecutorOptions<
  {},
  {},
  ActionParamsType
>;

export function getObsAIAssistantConnectorType(
  initResources: (request: KibanaRequest) => Promise<ObservabilityAIAssistantRouteHandlerResources>
): ObsAIAssistantConnectorType {
  return {
    id: '.observability-ai-assistant',
    isSystemActionType: true,
    getKibanaPrivileges: (params) => [],
    minimumLicenseRequired: 'gold',
    name: i18n.translate('xpack.observabilityAiAssistant.alertConnector.title', {
      defaultMessage: 'Observability AI Assistant',
    }),
    supportedFeatureIds: [AlertingConnectorFeatureId],
    validate: {
      config: {
        schema: schema.object({}),
        customValidator: () => {},
      },
      params: {
        schema: ParamsSchema,
      },
      secrets: {
        schema: schema.object({}),
      },
    },
    renderParameterTemplates,
    executor(options) {
      return executor(options, initResources);
    },
  };
}

function renderParameterTemplates(
  logger: Logger,
  params: ActionParamsType,
  variables: Record<string, unknown>
): ActionParamsType {
  return {
    connector: params.connector,
    message: renderMustacheString(logger, params.message, variables, 'slack'),
  };
}

async function executor(
  execOptions: ObsAIAssistantConnectorTypeExecutorOptions,
  initResources: (request: KibanaRequest) => Promise<ObservabilityAIAssistantRouteHandlerResources>
): Promise<ConnectorTypeExecutorResult<unknown>> {
  const request = execOptions.request!;
  const resources = await initResources(request);
  const client = await resources.service.getClient({ request });
  const functionClient = await resources.service.getFunctionClient({
    signal: new AbortController().signal,
    resources,
    client,
    screenContexts: [],
  });
  const actionsClient = await (
    await resources.plugins.actions.start()
  ).getActionsClientWithRequest(request);

  await lastValueFrom(
    client
      .complete({
        functionClient,
        persist: true,
        connectorId: execOptions.params.connector,
        signal: new AbortController().signal,
        messages: [
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.System,
              content: `You are a helpful assistant for Elastic Observability.
                     An alert about a specific metric just fired. Your task is to
                     execute the workflow asked by the user. You can use the function
                     execute_connector if a webhook needs to be called. When a
                     webhook is called, include what url was called in your response.`,
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
              content: JSON.stringify({ connectors: await actionsClient.getAll() }),
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

export const getObsAIAssistantConnectorAdapter = (): ConnectorAdapter<
  ActionParamsType,
  ActionParamsType
> => {
  return {
    connectorTypeId: '.observability-ai-assistant',
    ruleActionParamsSchema: ParamsSchema,
    buildActionParams: ({ params }) => {
      return { connector: params.connector, message: params.message };
    },
  };
};
