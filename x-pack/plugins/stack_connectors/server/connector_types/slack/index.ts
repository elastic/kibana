/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import HttpProxyAgent from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { i18n } from '@kbn/i18n';
import { IncomingWebhook, IncomingWebhookResult } from '@slack/webhook';
import { pipe } from 'fp-ts/lib/pipeable';
import { map, getOrElse } from 'fp-ts/lib/Option';
import type { ActionTypeExecutorResult as ConnectorTypeExecutorResult } from '@kbn/actions-plugin/server/types';
import {
  AlertingConnectorFeatureId,
  UptimeConnectorFeatureId,
  SecurityConnectorFeatureId,
} from '@kbn/actions-plugin/common/types';
import { renderMustacheString } from '@kbn/actions-plugin/server/lib/mustache_renderer';
import { getCustomAgents } from '@kbn/actions-plugin/server/lib/get_custom_agents';
import { getRetryAfterIntervalFromHeaders } from '../lib/http_response_retry_header';
import type {
  PostMessageParams,
  SlackWebApiExecutorOptions,
  SlackWebhookExecutorOptions,
  WebhookParams,
  SlackExecutorOptions,
  SlackConnectorType,
  WebApiParams,
} from '../../../common/slack/types';
import { SlackSecretsSchema, SlackParamsSchema } from '../../../common/slack/schema';
import { SLACK_CONNECTOR_ID } from '../../../common/slack/constants';
import { SLACK_CONNECTOR_NAME } from './translations';
import type { SlackExecutorResultData } from './types';
import { api } from './api';
import { createExternalService } from './service';
import { validate } from './validators';

export function getConnectorType(): SlackConnectorType {
  return {
    id: SLACK_CONNECTOR_ID,
    minimumLicenseRequired: 'gold',
    name: SLACK_CONNECTOR_NAME,
    supportedFeatureIds: [
      AlertingConnectorFeatureId,
      UptimeConnectorFeatureId,
      SecurityConnectorFeatureId,
    ],
    validate: {
      secrets: {
        schema: SlackSecretsSchema,
        customValidator: validate.secrets,
      },
      params: {
        schema: SlackParamsSchema,
      },
    },
    renderParameterTemplates,
    executor: (execOptions: SlackExecutorOptions) => {
      const res =
        'webhookUrl' in execOptions.secrets
          ? slackWebhookExecutor(execOptions as SlackWebhookExecutorOptions)
          : slackWebApiExecutor(execOptions as SlackWebApiExecutorOptions);
      return res;
    },
  };
}

const renderParameterTemplates = (
  params: WebhookParams | WebApiParams,
  variables: Record<string, unknown>
) => {
  if ('message' in params)
    return { message: renderMustacheString(params.message, variables, 'slack') };
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

const slackWebhookExecutor = async (
  execOptions: SlackWebhookExecutorOptions
): Promise<ConnectorTypeExecutorResult<unknown>> => {
  const { actionId, secrets, params, configurationUtilities, logger } = execOptions;

  let result: IncomingWebhookResult;
  const { webhookUrl } = secrets;
  const { message } = params;
  const proxySettings = configurationUtilities.getProxySettings();

  const customAgents = getCustomAgents(configurationUtilities, logger, webhookUrl);
  const agent = webhookUrl.toLowerCase().startsWith('https')
    ? customAgents.httpsAgent
    : customAgents.httpAgent;

  if (proxySettings) {
    if (agent instanceof HttpProxyAgent || agent instanceof HttpsProxyAgent) {
      logger.debug(`IncomingWebhook was called with proxyUrl ${proxySettings.proxyUrl}`);
    }
  }

  try {
    // https://slack.dev/node-slack-sdk/webhook
    // node-slack-sdk use Axios inside :)
    const webhook = new IncomingWebhook(webhookUrl, {
      agent,
    });

    result = await webhook.send(message);
  } catch (err) {
    if (err.original == null || err.original.response == null) {
      return serviceErrorResult(actionId, err.message);
    }

    const { status, statusText, headers } = err.original.response;

    // special handling for 5xx
    if (status >= 500) {
      return retryResult(actionId, err.message);
    }

    // special handling for rate limiting
    if (status === 429) {
      return pipe(
        getRetryAfterIntervalFromHeaders(headers),
        map((retry) => retryResultSeconds(actionId, err.message, retry)),
        getOrElse(() => retryResult(actionId, err.message))
      );
    }

    const errMessage = i18n.translate(
      'xpack.stackConnectors.slack.unexpectedHttpResponseErrorMessage',
      {
        defaultMessage: 'unexpected http response from slack: {httpStatus} {httpStatusText}',
        values: {
          httpStatus: status,
          httpStatusText: statusText,
        },
      }
    );
    logger.error(`error on ${actionId} slack action: ${errMessage}`);

    return errorResult(actionId, errMessage);
  }

  if (result == null) {
    const errMessage = i18n.translate(
      'xpack.stackConnectors.slack.unexpectedNullResponseErrorMessage',
      {
        defaultMessage: 'unexpected null response from slack',
      }
    );
    return errorResult(actionId, errMessage);
  }

  if (result.text !== 'ok') {
    return serviceErrorResult(actionId, result.text);
  }

  return successResult(actionId, result);
};

function successResult(actionId: string, data: unknown): ConnectorTypeExecutorResult<unknown> {
  return { status: 'ok', data, actionId };
}

function errorResult(actionId: string, message: string): ConnectorTypeExecutorResult<void> {
  return {
    status: 'error',
    message,
    actionId,
  };
}
function serviceErrorResult(
  actionId: string,
  serviceMessage: string
): ConnectorTypeExecutorResult<void> {
  const errMessage = i18n.translate('xpack.stackConnectors.slack.errorPostingErrorMessage', {
    defaultMessage: 'error posting slack message',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
    serviceMessage,
  };
}

function retryResult(actionId: string, message: string): ConnectorTypeExecutorResult<void> {
  const errMessage = i18n.translate(
    'xpack.stackConnectors.slack.errorPostingRetryLaterErrorMessage',
    {
      defaultMessage: 'error posting a slack message, retry later',
    }
  );
  return {
    status: 'error',
    message: errMessage,
    retry: true,
    actionId,
  };
}

function retryResultSeconds(
  actionId: string,
  message: string,
  retryAfter: number
): ConnectorTypeExecutorResult<void> {
  const retryEpoch = Date.now() + retryAfter * 1000;
  const retry = new Date(retryEpoch);
  const retryString = retry.toISOString();
  const errMessage = i18n.translate(
    'xpack.stackConnectors.slack.errorPostingRetryDateErrorMessage',
    {
      defaultMessage: 'error posting a slack message, retry at {retryString}',
      values: {
        retryString,
      },
    }
  );
  return {
    status: 'error',
    message: errMessage,
    retry,
    actionId,
    serviceMessage: message,
  };
}

const supportedSubActions = ['getChannels', 'postMessage'];

const slackWebApiExecutor = async (
  execOptions: SlackWebApiExecutorOptions
): Promise<ConnectorTypeExecutorResult<SlackExecutorResultData | {}>> => {
  const { actionId, params, secrets, configurationUtilities, logger } = execOptions;
  const { subAction, subActionParams } = params;
  let data: SlackExecutorResultData | null = null;

  const externalService = createExternalService(
    {
      secrets,
    },
    logger,
    configurationUtilities
  );

  if (!api[subAction]) {
    const errorMessage = `[Action][ExternalService] Unsupported subAction type ${subAction}.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  if (!supportedSubActions.includes(subAction)) {
    const errorMessage = `[Action][ExternalService] subAction ${subAction} not implemented.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  if (subAction === 'getChannels') {
    data = await api.getChannels({
      externalService,
    });
  }

  if (subAction === 'postMessage') {
    const postMessageParams = subActionParams as PostMessageParams;
    data = await api.postMessage({
      externalService,
      params: postMessageParams,
    });
  }

  return { status: 'ok', data: data ?? {}, actionId };
};
