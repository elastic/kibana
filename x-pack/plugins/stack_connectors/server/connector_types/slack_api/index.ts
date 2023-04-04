/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionTypeExecutorResult as ConnectorTypeExecutorResult } from '@kbn/actions-plugin/server/types';
import {
  AlertingConnectorFeatureId,
  UptimeConnectorFeatureId,
  SecurityConnectorFeatureId,
} from '@kbn/actions-plugin/common/types';
import { renderMustacheString } from '@kbn/actions-plugin/server/lib/mustache_renderer';
import type {
  SlackApiExecutorOptions,
  SlackApiConnectorType,
  SlackApiParams,
} from '../../../common/slack_api/types';
import { SlackApiSecretsSchema, SlackApiParamsSchema } from '../../../common/slack_api/schema';
import { SLACK_API_CONNECTOR_ID } from '../../../common/slack_api/constants';
import { SLACK_CONNECTOR_NAME } from './translations';
import { api } from './api';
import { createExternalService } from './service';

const supportedSubActions = ['getChannels', 'postMessage'];

export const getConnectorType = (): SlackApiConnectorType => {
  return {
    id: SLACK_API_CONNECTOR_ID,
    minimumLicenseRequired: 'gold',
    name: SLACK_CONNECTOR_NAME,
    supportedFeatureIds: [
      AlertingConnectorFeatureId,
      UptimeConnectorFeatureId,
      SecurityConnectorFeatureId,
    ],
    validate: {
      secrets: {
        schema: SlackApiSecretsSchema,
      },
      params: {
        schema: SlackApiParamsSchema,
      },
    },
    renderParameterTemplates,
    executor: async (execOptions: SlackApiExecutorOptions) => await slackApiExecutor(execOptions),
  };
};

const renderParameterTemplates = (params: SlackApiParams, variables: Record<string, unknown>) => {
  if (params.subAction === 'postMessage')
    return {
      subAction: params.subAction,
      subActionParams: {
        ...params.subActionParams,
        text: renderMustacheString(params.subActionParams.text, variables, 'slack'),
      },
    };
  return params;
};

const slackApiExecutor = async (
  execOptions: SlackApiExecutorOptions
): Promise<ConnectorTypeExecutorResult<unknown>> => {
  const { actionId, params, secrets, configurationUtilities, logger } = execOptions;
  const subAction = params.subAction;

  if (!api[subAction]) {
    const errorMessage = `[Action][ExternalService] -> [Slack API] Unsupported subAction type ${subAction}.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  if (!supportedSubActions.includes(subAction)) {
    const errorMessage = `[Action][ExternalService] -> [Slack API] subAction ${subAction} not implemented.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  const externalService = createExternalService(
    {
      secrets,
    },
    logger,
    configurationUtilities
  );

  if (subAction === 'getChannels') {
    return await api.getChannels({
      externalService,
    });
  }

  if (subAction === 'postMessage') {
    return await api.postMessage({
      externalService,
      params: params.subActionParams,
    });
  }

  return { status: 'ok', data: {}, actionId };
};
