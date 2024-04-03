/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

export function getObsAIAssistantConnectorType(): ObsAIAssistantConnectorType {
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
      return executor(options);
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
  execOptions: ObsAIAssistantConnectorTypeExecutorOptions
): Promise<ConnectorTypeExecutorResult<unknown>> {
  return { actionId: execOptions.actionId, status: 'ok' };
}
