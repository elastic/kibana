/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { schema, TypeOf } from '@kbn/config-schema';
import { Logger } from '@kbn/core/server';
import { AlertingConnectorFeatureId } from '@kbn/actions-plugin/common/connector_feature_config';
import { renderMustacheString } from '@kbn/actions-plugin/server/lib/mustache_renderer';
import type {
  ActionType as ConnectorType,
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
} from '@kbn/actions-plugin/server/types';
import type { ObservabilityAIAssistantClient } from '@kbn/observability-ai-assistant-plugin/server/service/client';
import { MessageRole } from '@kbn/observability-ai-assistant-plugin/common/types';
import { concatenateChatCompletionChunks } from '@kbn/observability-ai-assistant-plugin/common/utils/concatenate_chat_completion_chunks';

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
  getObsAIClient: () => Promise<ObservabilityAIAssistantClient | undefined>;
}): ObsAIAssistantConnectorType {
  return {
    id: '.observability-ai-assistant',
    minimumLicenseRequired: 'enterprise',
    name: i18n.translate('xpack.stackConnectors.observabilityAIAssistant.title', {
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
  getObsAIClient: () => Promise<ObservabilityAIAssistantClient | undefined>
): Promise<ConnectorTypeExecutorResult<unknown>> {
  const obsAIClient = await getObsAIClient();
  if (!obsAIClient) {
    return { actionId: execOptions.actionId, status: 'error' };
  }

  const response = await lastValueFrom(
    (
      await obsAIClient.chat('alert_action', {
        connectorId: 'azure-open-ai',
        signal: new AbortController().signal,
        messages: [
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.System,
              content: `You are a helpful assistant for Elastic Observability.
                  Your task is to create a report for an alert that just fired.
                  This report should be sent to the appropriate connector (ie
                  slack, email..) if there is one configured. The report is aimed
                  at SRE. You should attempt to include resolved or ongoing issues
                  of the same alert to help troubleshoot the root cause. Also include
                  a list of ongoing alerts that could be related.`,
            },
          },
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.User,
              content: 'Can you please tell me more about the ongoing alert ?',
            },
          },
        ],
      })
    ).pipe(concatenateChatCompletionChunks())
  );

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(response));

  return { actionId: execOptions.actionId, status: 'ok' };
}
