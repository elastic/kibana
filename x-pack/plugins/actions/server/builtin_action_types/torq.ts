/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { curry } from 'lodash';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { schema, TypeOf } from '@kbn/config-schema';
import { pipe } from 'fp-ts/lib/pipeable';
import { map, getOrElse } from 'fp-ts/lib/Option';
import { Logger } from '@kbn/core/server';
import { getRetryAfterIntervalFromHeaders } from './lib/http_rersponse_retry_header';
import { isOk, promiseResult, Result } from './lib/result_type';
import { ActionType, ActionTypeExecutorOptions, ActionTypeExecutorResult } from '../types';
import { ActionsConfigurationUtilities } from '../actions_config';
import { request } from './lib/axios_utils';
import { renderMustacheString } from '../lib/mustache_renderer';
import {
  AlertingConnectorFeatureId,
  UptimeConnectorFeatureId,
  SecurityConnectorFeatureId,
} from '../../common';


export type TorqActionType = ActionType<
  ActionTypeConfigType,
  ActionTypeSecretsType,
  ActionParamsType,
  unknown
>;
export type TorqActionTypeExecutorOptions = ActionTypeExecutorOptions<
  ActionTypeConfigType,
  ActionTypeSecretsType,
  ActionParamsType
>;

const configSchemaProps = {
  webhook_integration_url: schema.string(),
};
const ConfigSchema = schema.object(configSchemaProps);
export type ActionTypeConfigType = TypeOf<typeof ConfigSchema>;

// secrets definition
export type ActionTypeSecretsType = TypeOf<typeof SecretsSchema>;
const secretSchemaProps = {
  token: schema.nullable(schema.string()),
};
const SecretsSchema = schema.object(secretSchemaProps, {
  validate: (secrets) => {
    if (!secrets.token) {
      return i18n.translate('xpack.actions.builtin.torq.secrets.tokenRequiredErrorMessage', {
        defaultMessage: 'token is required',
      });
    }
  },
});

// params definition
export type ActionParamsType = TypeOf<typeof ParamsSchema>;
const ParamsSchema = schema.object({
  body: schema.maybe(schema.string()),
});

export const ActionTypeId = '.torq';
// action type definition
export function getActionType({
  logger,
  configurationUtilities,
}: {
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
}): TorqActionType {
  return {
    id: ActionTypeId,
    minimumLicenseRequired: 'basic',
    name: i18n.translate('xpack.actions.builtin.torqTitle', {
      defaultMessage: 'Torq',
    }),
    supportedFeatureIds: [
      AlertingConnectorFeatureId,
      UptimeConnectorFeatureId,
      SecurityConnectorFeatureId,
    ],
    validate: {
      config: schema.object(configSchemaProps, {
        validate: curry(validateActionTypeConfig)(configurationUtilities),
      }),
      secrets: SecretsSchema,
      params: ParamsSchema,
    },
    renderParameterTemplates,
    executor: curry(executor)({ logger, configurationUtilities }),
  };
}

function renderParameterTemplates(
  params: ActionParamsType,
  variables: Record<string, unknown>
): ActionParamsType {
  if (!params.body) return params;
  return {
    body: renderMustacheString(params.body, variables, 'json'), // TODO: add default template here
  };
}

function validateActionTypeConfig(
  configurationUtilities: ActionsConfigurationUtilities,
  configObject: ActionTypeConfigType
) {
  const configuredUrl = configObject.webhook_integration_url;
  let configureUrlObj: URL;
  try {
    configureUrlObj = new URL(configuredUrl);
  } catch (err) {
    return i18n.translate('xpack.actions.builtin.torq.torqConfigurationErrorNoHostname', {
      defaultMessage: 'error configuring send to Torq action: unable to parse url: {err}',
      values: {
        err,
      },
    });
  }

  try {
    configurationUtilities.ensureUriAllowed(configuredUrl);
  } catch (allowListError) {
    return i18n.translate('xpack.actions.builtin.torq.torqConfigurationError', {
      defaultMessage: 'error configuring send to Torq action: {message}',
      values: {
        message: allowListError.message,
      },
    });
  }

  if (configureUrlObj.hostname !== 'hooks.torq.io') {
    return i18n.translate('xpack.actions.builtin.torq.torqConfigurationErrorInvalidHostname', {
      defaultMessage:
        'error configuring send to Torq action: url must begin with https://hooks.torq.io',
    });
  }
}

// action executor
export async function executor(
  {
    logger,
    configurationUtilities,
  }: { logger: Logger; configurationUtilities: ActionsConfigurationUtilities },
  execOptions: TorqActionTypeExecutorOptions
): Promise<ActionTypeExecutorResult<unknown>> {
  const actionId = execOptions.actionId;
  const { webhook_integration_url } = execOptions.config;
  const { body: data } = execOptions.params;

  const secrets: ActionTypeSecretsType = execOptions.secrets;
  const token = secrets.token;

  const axiosInstance = axios.create();
  const result: Result<AxiosResponse, AxiosError<{ message: string }>> = await promiseResult(
    request({
      axios: axiosInstance,
      url: webhook_integration_url,
      method: 'post',
      headers: {
        'X-Torq-Token': token || '',
      },
      params: {},
      data,
      configurationUtilities,
      logger,
    })
  );

  logger.debug(`torq action result: ${JSON.stringify(result)}`);

  if (isOk(result)) {
    const {
      value: { status, statusText },
    } = result;
    logger.debug(`response from Torq action "${actionId}": [HTTP ${status}] ${statusText}`);

    return successResult(actionId, data);
  } else {
    const { error } = result;
    if (error.response) {
      const {
        status,
        statusText,
        headers: responseHeaders,
        data: { message: responseMessage },
      } = error.response;
      const responseMessageAsSuffix = responseMessage ? `: ${responseMessage}` : '';
      const message = `[${status}] ${statusText}${responseMessageAsSuffix}`;
      logger.error(`error on ${actionId} Torq event: ${message}`);
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
          map((retry) => retryResultSeconds(actionId, message, retry)),
          getOrElse(() => retryResult(actionId, message))
        );
      }
      return errorResultInvalid(actionId, message);
    } else if (error.code) {
      const message = `[${error.code}] ${error.message}`;
      logger.error(`error on ${actionId} Torq event: ${message}`);
      return errorResultRequestFailed(actionId, message);
    } else if (error.isAxiosError) {
      const message = `${error.message}`;
      logger.error(`error on ${actionId} Torq event: ${message}`);
      return errorResultRequestFailed(actionId, message);
    }

    logger.error(`error on ${actionId} Torq action: unexpected error`);
    return errorResultUnexpectedError(actionId);
  }
}

// Action Executor Result w/ internationalisation
function successResult(actionId: string, data: unknown): ActionTypeExecutorResult<unknown> {
  return { status: 'ok', data, actionId };
}

function errorResultInvalid(
  actionId: string,
  serviceMessage: string
): ActionTypeExecutorResult<void> {
  const errMessage = i18n.translate('xpack.actions.builtin.torq.invalidResponseErrorMessage', {
    defaultMessage: 'error triggering Torq workflow, invalid response',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
    serviceMessage,
  };
}

function errorResultRequestFailed(
  actionId: string,
  serviceMessage: string
): ActionTypeExecutorResult<unknown> {
  const errMessage = i18n.translate('xpack.actions.builtin.torq.requestFailedErrorMessage', {
    defaultMessage: 'error triggering Torq workflow, request failed',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
    serviceMessage,
  };
}

function errorResultUnexpectedError(actionId: string): ActionTypeExecutorResult<void> {
  const errMessage = i18n.translate('xpack.actions.builtin.torq.unreachableErrorMessage', {
    defaultMessage: 'error triggering Torq workflow, unexpected error',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
  };
}

function retryResult(actionId: string, serviceMessage: string): ActionTypeExecutorResult<void> {
  const errMessage = i18n.translate(
    'xpack.actions.builtin.torq.invalidResponseRetryLaterErrorMessage',
    {
      defaultMessage: 'error triggering Torq workflow, retry later',
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
): ActionTypeExecutorResult<void> {
  const retryEpoch = Date.now() + retryAfter * 1000;
  const retry = new Date(retryEpoch);
  const retryString = retry.toISOString();
  const errMessage = i18n.translate(
    'xpack.actions.builtin.torq.invalidResponseRetryDateErrorMessage',
    {
      defaultMessage: 'error triggering Torq workflow, retry at {retryString}',
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
