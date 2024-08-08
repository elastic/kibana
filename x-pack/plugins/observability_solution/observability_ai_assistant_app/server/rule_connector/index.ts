/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter } from 'rxjs';
import { get } from 'lodash';
import dedent from 'dedent';
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
import {
  EmailParamsSchema,
  JiraParamsSchema,
  PagerdutyParamsSchema,
  SlackApiParamsSchema,
  SlackParamsSchema,
  WebhookParamsSchema,
} from '@kbn/stack-connectors-plugin/server';
import { ObservabilityAIAssistantRouteHandlerResources } from '@kbn/observability-ai-assistant-plugin/server/routes/types';
import {
  ChatCompletionChunkEvent,
  MessageRole,
  StreamingChatResponseEventType,
} from '@kbn/observability-ai-assistant-plugin/common';
import { concatenateChatCompletionChunks } from '@kbn/observability-ai-assistant-plugin/common/utils/concatenate_chat_completion_chunks';
import { CompatibleJSONSchema } from '@kbn/observability-ai-assistant-plugin/common/functions/types';
import { AlertDetailsContextualInsightsService } from '@kbn/observability-plugin/server/services';
import { getSystemMessageFromInstructions } from '@kbn/observability-ai-assistant-plugin/server/service/util/get_system_message_from_instructions';
import { AdHocInstruction } from '@kbn/observability-ai-assistant-plugin/common/types';
import { convertSchemaToOpenApi } from './convert_schema_to_open_api';
import { OBSERVABILITY_AI_ASSISTANT_CONNECTOR_ID } from '../../common/rule_connector';

const CONNECTOR_PRIVILEGES = ['api:observabilityAIAssistant', 'app:observabilityAIAssistant'];

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

const AlertSchema = schema.recordOf(schema.string(), schema.any());

const AlertSummarySchema = schema.object({
  new: schema.arrayOf(AlertSchema),
  recovered: schema.arrayOf(AlertSchema),
});

const ConnectorParamsSchema = schema.object({
  connector: schema.string(),
  message: schema.string({ minLength: 1 }),
  rule: RuleSchema,
  alerts: AlertSummarySchema,
});

type AlertSummary = TypeOf<typeof AlertSummarySchema>;
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
  initResources: (request: KibanaRequest) => Promise<ObservabilityAIAssistantRouteHandlerResources>,
  alertDetailsContextService: AlertDetailsContextualInsightsService
): ObsAIAssistantConnectorType {
  return {
    id: OBSERVABILITY_AI_ASSISTANT_CONNECTOR_ID,
    isSystemActionType: true,
    getKibanaPrivileges: () => CONNECTOR_PRIVILEGES,
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
      return executor(options, initResources, alertDetailsContextService);
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
    alerts: params.alerts,
  };
}

async function executor(
  execOptions: ObsAIAssistantConnectorTypeExecutorOptions,
  initResources: (request: KibanaRequest) => Promise<ObservabilityAIAssistantRouteHandlerResources>,
  alertDetailsContextService: AlertDetailsContextualInsightsService
): Promise<ConnectorTypeExecutorResult<unknown>> {
  const request = execOptions.request;
  const alerts = execOptions.params.alerts;

  if (!request) {
    throw new Error('AI Assistant connector requires a kibana request');
  }

  if (alerts.new.length === 0 && alerts.recovered.length === 0) {
    // connector could be executed with only ongoing actions. we use this path as
    // dedup mechanism to prevent triggering the same worfklow for an ongoing alert
    return { actionId: execOptions.actionId, status: 'ok' };
  }

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

  const backgroundInstruction: AdHocInstruction = {
    instruction_type: 'application_instruction',
    text: dedent(
      `You are called as a background process because alerts have changed state.
As a background process you are not interacting with a user. Because of that DO NOT ask for user
input if tasked to execute actions. You can generate multiple responses in a row.
If available, include the link of the conversation at the end of your answer.`
    ),
  };

  const alertsContext = await getAlertsContext(
    execOptions.params.rule,
    execOptions.params.alerts,
    async (alert: Record<string, any>) => {
      const prompt = await alertDetailsContextService.getAlertDetailsContext(
        {
          core: resources.context.core,
          licensing: resources.context.licensing,
          request: resources.request,
        },
        {
          alert_started_at: get(alert, 'kibana.alert.start'),
          'service.name': get(alert, 'service.name'),
          'service.environment': get(alert, 'service.environment'),
          'host.name': get(alert, 'host.name'),
        }
      );
      return prompt
        .map(({ description, data }) => `${description}:\n${JSON.stringify(data, null, 2)}`)
        .join('\n\n');
    }
  );

  client
    .complete({
      functionClient,
      persist: true,
      isPublic: true,
      connectorId: execOptions.params.connector,
      signal: new AbortController().signal,
      kibanaPublicUrl: (await resources.context.core).coreStart.http.basePath.publicBaseUrl,
      instructions: [backgroundInstruction],
      messages: [
        {
          '@timestamp': new Date().toISOString(),
          message: {
            role: MessageRole.System,
            content: getSystemMessageFromInstructions({
              availableFunctionNames: functionClient.getFunctions().map((fn) => fn.definition.name),
              applicationInstructions: functionClient.getInstructions(),
              userInstructions: [],
              adHocInstructions: [],
            }),
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
              name: 'get_alerts_context',
              arguments: JSON.stringify({}),
              trigger: MessageRole.Assistant as const,
            },
          },
        },
        {
          '@timestamp': new Date().toISOString(),
          message: {
            role: MessageRole.User,
            name: 'get_alerts_context',
            content: JSON.stringify({ context: alertsContext }),
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
    .subscribe({
      error: (err) => {
        execOptions.logger.error(err);
      },
    });

  return { actionId: execOptions.actionId, status: 'ok' };
}

export const getObsAIAssistantConnectorAdapter = (): ConnectorAdapter<
  ActionParamsType,
  ConnectorParamsType
> => {
  return {
    connectorTypeId: OBSERVABILITY_AI_ASSISTANT_CONNECTOR_ID,
    ruleActionParamsSchema: ParamsSchema,
    getKibanaPrivileges: () => CONNECTOR_PRIVILEGES,
    buildActionParams: ({ params, rule, ruleUrl, alerts }) => {
      return {
        connector: params.connector,
        message: params.message,
        rule: { id: rule.id, name: rule.name, tags: rule.tags, ruleUrl: ruleUrl ?? null },
        alerts: {
          new: alerts.new.data,
          recovered: alerts.recovered.data,
        },
      };
    },
  };
};

async function getAlertsContext(
  rule: RuleType,
  alerts: AlertSummary,
  getAlertContext: (alert: Record<string, any>) => Promise<string>
): Promise<string> {
  const getAlertGroupDetails = async (alertGroup: Array<Record<string, any>>) => {
    const formattedDetails = await Promise.all(
      alertGroup.map(async (alert) => {
        return `- ${JSON.stringify(
          alert
        )}. The following contextual information is available:\n${await getAlertContext(alert)}`;
      })
    ).then((messages) => messages.join('\n'));

    return formattedDetails;
  };

  let details = `The following alerts have changed state for the rule ${JSON.stringify(
    rule,
    null,
    2
  )}:\n`;
  if (alerts.new.length > 0) {
    details += `- ${alerts.new.length} alerts have fired:\n${await getAlertGroupDetails(
      alerts.new
    )}\n`;
  }
  if (alerts.recovered.length > 0) {
    details += `- ${alerts.recovered.length} alerts have recovered\n: ${await getAlertGroupDetails(
      alerts.recovered
    )}\n`;
  }

  return details;
}
