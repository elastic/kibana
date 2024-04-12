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
import type {
  ActionType as ConnectorType,
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
} from '@kbn/actions-plugin/server/types';
import { ConnectorAdapter } from '@kbn/alerting-plugin/server';
import { SlackApiParamsSchema } from '@kbn/stack-connectors-plugin/common';
import {
  EmailParamsSchema,
  JiraParamsSchema,
  PagerdutyParamsSchema,
  SlackParamsSchema,
  WebhookParamsSchema,
} from '@kbn/stack-connectors-plugin/server';
import { ObservabilityAIAssistantRouteHandlerResources } from '../routes/types';
import {
  ChatCompletionChunkEvent,
  MessageRole,
  StreamingChatResponseEventType,
} from '../../common';
import { OBSERVABILITY_AI_ASSISTANT_CONNECTOR_ID } from '../../common/rule_connector';
import { concatenateChatCompletionChunks } from '../../common/utils/concatenate_chat_completion_chunks';
import { ChatFunctionClient } from '../service/chat_function_client';
import { convertSchemaToOpenApi } from './convert_schema_to_open_api';
import { CompatibleJSONSchema } from '../../common/functions/types';

const connectorParamsSchemas: Record<string, CompatibleJSONSchema> = {
  '.slack_api': convertSchemaToOpenApi(SlackApiParamsSchema),
  '.slack': convertSchemaToOpenApi(SlackParamsSchema),
  '.email': convertSchemaToOpenApi(EmailParamsSchema),
  '.webhook': convertSchemaToOpenApi(WebhookParamsSchema),
  '.jira': convertSchemaToOpenApi(JiraParamsSchema),
  '.pagerduty': convertSchemaToOpenApi(PagerdutyParamsSchema),
};

const ParamsSchema = schema.object({
  connector: schema.string(),
  message: schema.string({ minLength: 1 }),
});

const RuleSchema = schema.object({
  id: schema.string(),
  name: schema.string(),
  tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
  ruleUrl: schema.nullable(schema.string()),
});

const AlertStateSchema = schema.oneOf([
  schema.literal('new'),
  schema.literal('ongoing'),
  schema.literal('recovered'),
  schema.literal('unknown'),
]);

const ConnectorParamsSchema = schema.object({
  connector: schema.string(),
  message: schema.string({ minLength: 1 }),
  rule: RuleSchema,
  alertState: AlertStateSchema,
});

type AlertState = TypeOf<typeof AlertStateSchema>;
export type ActionParamsType = TypeOf<typeof ParamsSchema>;
export type ConnectorParamsType = TypeOf<typeof ConnectorParamsSchema>;
type RuleType = TypeOf<typeof RuleSchema>;

export type ObsAIAssistantConnectorType = ConnectorType<{}, {}, ConnectorParamsType, unknown>;

export type ObsAIAssistantConnectorTypeExecutorOptions = ConnectorTypeExecutorOptions<
  {},
  {},
  ConnectorParamsType
>;

export function getObsAIAssistantConnectorType(
  initResources: (request: KibanaRequest) => Promise<ObservabilityAIAssistantRouteHandlerResources>
): ObsAIAssistantConnectorType {
  return {
    id: OBSERVABILITY_AI_ASSISTANT_CONNECTOR_ID,
    isSystemActionType: true,
    getKibanaPrivileges: (params) => [
      'api:observabilityAIAssistant',
      'app:observabilityAIAssistant',
    ],
    minimumLicenseRequired: 'enterprise',
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
        schema: ConnectorParamsSchema,
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
  params: ConnectorParamsType,
  variables: Record<string, unknown>
): ConnectorParamsType {
  return {
    connector: params.connector,
    message: params.message,
    rule: params.rule,
    alertState: params.alertState,
  };
}

async function executor(
  execOptions: ObsAIAssistantConnectorTypeExecutorOptions,
  initResources: (request: KibanaRequest) => Promise<ObservabilityAIAssistantRouteHandlerResources>
): Promise<ConnectorTypeExecutorResult<unknown>> {
  const state = execOptions.params.alertState;

  if (state !== 'new') {
    // system connector action frequency can't be user configured. we use this
    // flag as dedup mechanism to prevent triggering the same worfklow again.
    // while recovered state is a valid trigger we only allow new alerts for now
    return { actionId: execOptions.actionId, status: 'ok' };
  }

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

  const connectorsList = await actionsClient.getAll().then((connectors) => {
    return connectors.map((connector) => {
      if (connector.actionTypeId in connectorParamsSchemas) {
        return {
          ...connector,
          parameters: connectorParamsSchemas[connector.actionTypeId],
        };
      }

      return connector;
    });
  });

  const systemMessage = buildSystemMessage(functionClient, execOptions.params.rule, state);

  await lastValueFrom(
    client
      .complete({
        functionClient,
        persist: true,
        isPublic: true,
        connectorId: execOptions.params.connector,
        signal: new AbortController().signal,
        kibanaPublicUrl: (await resources.context.core).coreStart.http.basePath.publicBaseUrl,
        messages: [
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.System,
              content: systemMessage,
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
                connectors: connectorsList,
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

export const getObsAIAssistantConnectorAdapter = (): ConnectorAdapter<
  ActionParamsType,
  ConnectorParamsType
> => {
  return {
    connectorTypeId: OBSERVABILITY_AI_ASSISTANT_CONNECTOR_ID,
    ruleActionParamsSchema: ParamsSchema,
    buildActionParams: ({ params, rule, ruleUrl, alerts }) => {
      return {
        connector: params.connector,
        message: params.message,
        rule: { id: rule.id, name: rule.name, tags: rule.tags, ruleUrl: ruleUrl ?? null },
        alertState:
          alerts.new.count > 0
            ? 'new'
            : alerts.ongoing.count > 0
            ? 'ongoing'
            : alerts.recovered.count > 0
            ? 'recovered'
            : 'unknown',
      };
    },
  };
};

function buildSystemMessage(functionClient: ChatFunctionClient, rule: RuleType, state: AlertState) {
  let systemMessage = functionClient.getContexts().find((def) => def.name === 'core')?.description;
  systemMessage += ` You are called as a background process because the alert ${JSON.stringify(
    rule
  )} ${state === 'new' ? 'fired' : 'recovered'}.`;
  systemMessage +=
    ' As a background process you are not interacting with a user. Because of that DO NOT ask for user';
  systemMessage +=
    ' input if tasked to execute actions. You can generate multiple responses in a row.';
  systemMessage += ' If available, include the link to the conversation at the end of your answer.';

  return systemMessage;
}
