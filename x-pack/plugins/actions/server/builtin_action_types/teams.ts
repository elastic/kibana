/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { URL } from 'url';
import { curry } from 'lodash';
import { HttpsProxyAgent } from 'https-proxy-agent';
import HttpProxyAgent from 'http-proxy-agent';
import { i18n } from '@kbn/i18n';
import { schema, TypeOf } from '@kbn/config-schema';
import { IncomingWebhook, IncomingWebhookResult } from '@slack/webhook';
import { pipe } from 'fp-ts/lib/pipeable';
import { map, getOrElse } from 'fp-ts/lib/Option';
import { Logger } from '../../../../../src/core/server';
import { getRetryAfterIntervalFromHeaders } from './lib/http_rersponse_retry_header';

import {
  ActionType,
  ActionTypeExecutorOptions,
  ActionTypeExecutorResult,
  ExecutorType,
} from '../types';
import { ActionsConfigurationUtilities } from '../actions_config';
import { getProxyAgent } from './lib/get_proxy_agent';

export type TeamsActionType = ActionType<{}, ActionTypeSecretsType, ActionParamsType, unknown>;
export type TeamsActionTypeExecutorOptions = ActionTypeExecutorOptions<
  {},
  ActionTypeSecretsType,
  ActionParamsType
>;

// secrets definition

export type ActionTypeSecretsType = TypeOf<typeof SecretsSchema>;

const secretsSchemaProps = {
  webhookUrl: schema.string(),
};
const SecretsSchema = schema.object(secretsSchemaProps);

// params definition

export type ActionParamsType = TypeOf<typeof ParamsSchema>;

const ParamsSchema = schema.object({
  message: schema.string({ minLength: 1 }),
});

// action type definition

// customizing executor is only used for tests
export function getActionType({
  logger,
  configurationUtilities,
  executor = curry(teamsExecutor)({ logger }),
}: {
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
  executor?: ExecutorType<{}, ActionTypeSecretsType, ActionParamsType, unknown>;
}): TeamsActionType {
  return {
    id: '.teams',
    minimumLicenseRequired: 'gold',
    name: i18n.translate('xpack.actions.builtin.teamsTitle', {
      defaultMessage: 'Microsoft Teams',
    }),
    validate: {
      secrets: schema.object(secretsSchemaProps, {
        validate: curry(validateActionTypeConfig)(configurationUtilities),
      }),
      params: ParamsSchema,
    },
    executor,
  };
}

function validateActionTypeConfig(
  configurationUtilities: ActionsConfigurationUtilities,
  secretsObject: ActionTypeSecretsType
) {
  let url: URL;
  try {
    url = new URL(secretsObject.webhookUrl);
  } catch (err) {
    return i18n.translate('xpack.actions.builtin.teams.teamsConfigurationErrorNoHostname', {
      defaultMessage: 'error configuring teams action: unable to parse host name from webhookUrl',
    });
  }

  try {
    configurationUtilities.ensureHostnameAllowed(url.hostname);
  } catch (allowListError) {
    return i18n.translate('xpack.actions.builtin.teams.teamsConfigurationError', {
      defaultMessage: 'error configuring teams action: {message}',
      values: {
        message: allowListError.message,
      },
    });
  }
}

// action executor

async function teamsExecutor(
  { logger }: { logger: Logger },
  execOptions: TeamsActionTypeExecutorOptions
): Promise<ActionTypeExecutorResult<unknown>> {
  const actionId = execOptions.actionId;
  const secrets = execOptions.secrets;
  const params = execOptions.params;

  let result: IncomingWebhookResult;
  const { webhookUrl } = secrets;
  const { message } = params;

  let proxyAgent: HttpsProxyAgent | HttpProxyAgent | undefined;
  if (execOptions.proxySettings) {
    proxyAgent = getProxyAgent(execOptions.proxySettings, logger);
    logger.debug(`IncomingWebhook was called with proxyUrl ${execOptions.proxySettings.proxyUrl}`);
  }

  try {
    // https://slack.dev/node-slack-sdk/webhook
    // node-slack-sdk use Axios inside :)
    const webhook = new IncomingWebhook(webhookUrl, {
      agent: proxyAgent,
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
      'xpack.actions.builtin.teams.unexpectedHttpResponseErrorMessage',
      {
        defaultMessage:
          'unexpected http response from Microsoft Teams: {httpStatus} {httpStatusText}',
        values: {
          httpStatus: status,
          httpStatusText: statusText,
        },
      }
    );
    logger.error(`error on ${actionId} teams action: ${errMessage}`);

    return errorResult(actionId, errMessage);
  }

  if (result == null) {
    const errMessage = i18n.translate(
      'xpack.actions.builtin.teams.unexpectedNullResponseErrorMessage',
      {
        defaultMessage: 'unexpected null response from Microsoft Teams',
      }
    );
    return errorResult(actionId, errMessage);
  }

  if (result.text !== 'ok') {
    return serviceErrorResult(actionId, result.text);
  }

  return successResult(actionId, result);
}

function successResult(actionId: string, data: unknown): ActionTypeExecutorResult<unknown> {
  return { status: 'ok', data, actionId };
}

function errorResult(actionId: string, message: string): ActionTypeExecutorResult<void> {
  return {
    status: 'error',
    message,
    actionId,
  };
}
function serviceErrorResult(
  actionId: string,
  serviceMessage: string
): ActionTypeExecutorResult<void> {
  const errMessage = i18n.translate('xpack.actions.builtin.teams.errorPostingErrorMessage', {
    defaultMessage: 'error posting Microsoft Teams message',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
    serviceMessage,
  };
}

function retryResult(actionId: string, message: string): ActionTypeExecutorResult<void> {
  const errMessage = i18n.translate(
    'xpack.actions.builtin.teams.errorPostingRetryLaterErrorMessage',
    {
      defaultMessage: 'error posting a Microsoft Teams message, retry later',
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
): ActionTypeExecutorResult<void> {
  const retryEpoch = Date.now() + retryAfter * 1000;
  const retry = new Date(retryEpoch);
  const retryString = retry.toISOString();
  const errMessage = i18n.translate(
    'xpack.actions.builtin.teams.errorPostingRetryDateErrorMessage',
    {
      defaultMessage: 'error posting a Microsoft Teams message, retry at {retryString}',
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
