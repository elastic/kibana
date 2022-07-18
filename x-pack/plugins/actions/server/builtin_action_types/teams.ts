/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { URL } from 'url';
import { curry, isString } from 'lodash';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { i18n } from '@kbn/i18n';
import { schema, TypeOf } from '@kbn/config-schema';
import { pipe } from 'fp-ts/lib/pipeable';
import { map, getOrElse } from 'fp-ts/lib/Option';
import { Logger } from '@kbn/core/server';
import { getRetryAfterIntervalFromHeaders } from './lib/http_rersponse_retry_header';
import { isOk, promiseResult, Result } from './lib/result_type';
import { request } from './lib/axios_utils';
import { ActionType, ActionTypeExecutorOptions, ActionTypeExecutorResult } from '../types';
import { ActionsConfigurationUtilities } from '../actions_config';

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

export const ActionTypeId = '.teams';
// action type definition
export function getActionType({
  logger,
  configurationUtilities,
}: {
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
}): TeamsActionType {
  return {
    id: ActionTypeId,
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
    executor: curry(teamsExecutor)({ logger, configurationUtilities }),
  };
}

function validateActionTypeConfig(
  configurationUtilities: ActionsConfigurationUtilities,
  secretsObject: ActionTypeSecretsType
) {
  const configuredUrl = secretsObject.webhookUrl;
  try {
    new URL(configuredUrl);
  } catch (err) {
    return i18n.translate('xpack.actions.builtin.teams.teamsConfigurationErrorNoHostname', {
      defaultMessage: 'error configuring teams action: unable to parse host name from webhookUrl',
    });
  }

  try {
    configurationUtilities.ensureUriAllowed(configuredUrl);
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
  {
    logger,
    configurationUtilities,
  }: { logger: Logger; configurationUtilities: ActionsConfigurationUtilities },
  execOptions: TeamsActionTypeExecutorOptions
): Promise<ActionTypeExecutorResult<unknown>> {
  const actionId = execOptions.actionId;
  const secrets = execOptions.secrets;
  const params = execOptions.params;
  const { webhookUrl } = secrets;
  const { message } = params;
  const data = { text: message };

  const axiosInstance = axios.create();

  const result: Result<AxiosResponse, AxiosError> = await promiseResult(
    request({
      axios: axiosInstance,
      method: 'post',
      url: webhookUrl,
      logger,
      data,
      configurationUtilities,
    })
  );

  if (isOk(result)) {
    const {
      value: { status, statusText, data: responseData, headers: responseHeaders },
    } = result;

    // Microsoft Teams connectors do not throw 429s. Rather they will return a 200 response
    // with a 429 message in the response body when the rate limit is hit
    // https://docs.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/connectors-using#rate-limiting-for-connectors
    if (isString(responseData) && responseData.includes('ErrorCode:ApplicationThrottled')) {
      return pipe(
        getRetryAfterIntervalFromHeaders(responseHeaders),
        map((retry) => retryResultSeconds(actionId, message, retry)),
        getOrElse(() => retryResult(actionId, message))
      );
    }

    logger.debug(`response from teams action "${actionId}": [HTTP ${status}] ${statusText}`);

    return successResult(actionId, data);
  } else {
    const { error } = result;

    if (error.response) {
      const { status, statusText } = error.response;
      const serviceMessage = `[${status}] ${statusText}`;
      logger.error(`error on ${actionId} Microsoft Teams event: ${serviceMessage}`);

      // special handling for 5xx
      if (status >= 500) {
        return retryResult(actionId, serviceMessage);
      }

      return errorResultInvalid(actionId, serviceMessage);
    }

    logger.debug(`error on ${actionId} Microsoft Teams action: unexpected error`);
    return errorResultUnexpectedError(actionId);
  }
}

function successResult(actionId: string, data: unknown): ActionTypeExecutorResult<unknown> {
  return { status: 'ok', data, actionId };
}

function errorResultUnexpectedError(actionId: string): ActionTypeExecutorResult<void> {
  const errMessage = i18n.translate('xpack.actions.builtin.teams.unreachableErrorMessage', {
    defaultMessage: 'error posting to Microsoft Teams, unexpected error',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
  };
}

function errorResultInvalid(
  actionId: string,
  serviceMessage: string
): ActionTypeExecutorResult<void> {
  const errMessage = i18n.translate('xpack.actions.builtin.teams.invalidResponseErrorMessage', {
    defaultMessage: 'error posting to Microsoft Teams, invalid response',
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
