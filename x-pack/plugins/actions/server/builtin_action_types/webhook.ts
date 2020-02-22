/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { curry, isString } from 'lodash';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { schema, TypeOf } from '@kbn/config-schema';
import { pipe } from 'fp-ts/lib/pipeable';
import { map, getOrElse } from 'fp-ts/lib/Option';
import { getRetryAfterIntervalFromHeaders } from './lib/http_rersponse_retry_header';
import { nullableType } from './lib/nullable';
import { isOk, promiseResult, Result } from './lib/result_type';
import { ActionType, ActionTypeExecutorOptions, ActionTypeExecutorResult } from '../types';
import { ActionsConfigurationUtilities } from '../actions_config';
import { Logger } from '../../../../../src/core/server';

// config definition
enum WebhookMethods {
  POST = 'post',
  PUT = 'put',
}

const HeadersSchema = schema.recordOf(schema.string(), schema.string());
const configSchemaProps = {
  url: schema.string(),
  method: schema.oneOf([schema.literal(WebhookMethods.POST), schema.literal(WebhookMethods.PUT)], {
    defaultValue: WebhookMethods.POST,
  }),
  headers: nullableType(HeadersSchema),
};
const ConfigSchema = schema.object(configSchemaProps);
type ActionTypeConfigType = TypeOf<typeof ConfigSchema>;

// secrets definition
export type ActionTypeSecretsType = TypeOf<typeof SecretsSchema>;
const secretSchemaProps = {
  user: schema.nullable(schema.string()),
  password: schema.nullable(schema.string()),
};
const SecretsSchema = schema.object(secretSchemaProps, {
  validate: secrets => {
    // user and password must be set together (or not at all)
    if (!secrets.password && !secrets.user) return;
    if (secrets.password && secrets.user) return;
    return i18n.translate('xpack.actions.builtin.webhook.invalidUsernamePassword', {
      defaultMessage: 'both user and password must be specified',
    });
  },
});

// params definition
type ActionParamsType = TypeOf<typeof ParamsSchema>;
const ParamsSchema = schema.object({
  body: schema.maybe(schema.string()),
});

// action type definition
export function getActionType({
  logger,
  configurationUtilities,
}: {
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
}): ActionType {
  return {
    id: '.webhook',
    name: i18n.translate('xpack.actions.builtin.webhookTitle', {
      defaultMessage: 'Webhook',
    }),
    validate: {
      config: schema.object(configSchemaProps, {
        validate: curry(validateActionTypeConfig)(configurationUtilities),
      }),
      secrets: SecretsSchema,
      params: ParamsSchema,
    },
    executor: curry(executor)({ logger }),
  };
}

function validateActionTypeConfig(
  configurationUtilities: ActionsConfigurationUtilities,
  configObject: ActionTypeConfigType
) {
  try {
    configurationUtilities.ensureWhitelistedUri(configObject.url);
  } catch (whitelistError) {
    return i18n.translate('xpack.actions.builtin.webhook.webhookConfigurationError', {
      defaultMessage: 'error configuring webhook action: {message}',
      values: {
        message: whitelistError.message,
      },
    });
  }
}

// action executor
export async function executor(
  { logger }: { logger: Logger },
  execOptions: ActionTypeExecutorOptions
): Promise<ActionTypeExecutorResult> {
  const actionId = execOptions.actionId;
  const { method, url, headers = {} } = execOptions.config as ActionTypeConfigType;
  const { body: data } = execOptions.params as ActionParamsType;

  const secrets: ActionTypeSecretsType = execOptions.secrets as ActionTypeSecretsType;
  const basicAuth =
    isString(secrets.user) && isString(secrets.password)
      ? { auth: { username: secrets.user, password: secrets.password } }
      : {};

  const result: Result<AxiosResponse, AxiosError> = await promiseResult(
    axios.request({
      method,
      url,
      ...basicAuth,
      headers,
      data,
    })
  );

  if (isOk(result)) {
    const {
      value: { status, statusText },
    } = result;
    logger.debug(`response from webhook action "${actionId}": [HTTP ${status}] ${statusText}`);

    return successResult(actionId, data);
  } else {
    const { error } = result;

    if (error.response) {
      const { status, statusText, headers: responseHeaders } = error.response;
      const message = `[${status}] ${statusText}`;
      logger.warn(`error on ${actionId} webhook event: ${message}`);
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      // special handling for 5xx
      if (status >= 500) {
        return retryResult(actionId, message);
      }

      // special handling for rate limiting
      if (status === 429) {
        return pipe(
          getRetryAfterIntervalFromHeaders(responseHeaders),
          map(retry => retryResultSeconds(actionId, message, retry)),
          getOrElse(() => retryResult(actionId, message))
        );
      }
      return errorResultInvalid(actionId, message);
    }

    logger.warn(`error on ${actionId} webhook action: unexpected error`);
    return errorResultUnexpectedError(actionId);
  }
}

// Action Executor Result w/ internationalisation
function successResult(actionId: string, data: any): ActionTypeExecutorResult {
  return { status: 'ok', data, actionId };
}

function errorResultInvalid(actionId: string, serviceMessage: string): ActionTypeExecutorResult {
  const errMessage = i18n.translate('xpack.actions.builtin.webhook.invalidResponseErrorMessage', {
    defaultMessage: 'error calling webhook, invalid response',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
    serviceMessage,
  };
}

function errorResultUnexpectedError(actionId: string): ActionTypeExecutorResult {
  const errMessage = i18n.translate('xpack.actions.builtin.webhook.unreachableErrorMessage', {
    defaultMessage: 'error calling webhook, unexpected error',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
  };
}

function retryResult(actionId: string, serviceMessage: string): ActionTypeExecutorResult {
  const errMessage = i18n.translate(
    'xpack.actions.builtin.webhook.invalidResponseRetryLaterErrorMessage',
    {
      defaultMessage: 'error calling webhook, retry later',
    }
  );
  return {
    status: 'error',
    message: errMessage,
    retry: true,
    actionId,
    serviceMessage,
  };
}

function retryResultSeconds(
  actionId: string,
  serviceMessage: string,

  retryAfter: number
): ActionTypeExecutorResult {
  const retryEpoch = Date.now() + retryAfter * 1000;
  const retry = new Date(retryEpoch);
  const retryString = retry.toISOString();
  const errMessage = i18n.translate(
    'xpack.actions.builtin.webhook.invalidResponseRetryDateErrorMessage',
    {
      defaultMessage: 'error calling webhook, retry at {retryString}',
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
    serviceMessage,
  };
}
