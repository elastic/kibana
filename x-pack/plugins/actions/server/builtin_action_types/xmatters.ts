/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { curry, isString } from 'lodash';
import { AxiosError, AxiosResponse } from 'axios';
import { schema, TypeOf } from '@kbn/config-schema';
import { pipe } from 'fp-ts/lib/pipeable';
import { map, getOrElse } from 'fp-ts/lib/Option';
import { getRetryAfterIntervalFromHeaders } from './lib/http_rersponse_retry_header';
import { isOk, Result } from './lib/result_type';
import { ActionType, ActionTypeExecutorOptions, ActionTypeExecutorResult } from '../types';
import { ActionsConfigurationUtilities } from '../actions_config';
import { Logger } from '../../../../../src/core/server';
import { postXmatters } from './lib/post_xmatters';

export type XmattersActionType = ActionType<
  ActionTypeConfigType,
  ActionTypeSecretsType,
  ActionParamsType,
  unknown
>;
export type XmattersActionTypeExecutorOptions = ActionTypeExecutorOptions<
  ActionTypeConfigType,
  ActionTypeSecretsType,
  ActionParamsType
>;

const configSchemaProps = {
  url: schema.string(),
  hasAuth: schema.boolean({ defaultValue: true }),
};
const ConfigSchema = schema.object(configSchemaProps);
export type ActionTypeConfigType = TypeOf<typeof ConfigSchema>;

// secrets definition
export type ActionTypeSecretsType = TypeOf<typeof SecretsSchema>;
const secretSchemaProps = {
  user: schema.nullable(schema.string()),
  password: schema.nullable(schema.string()),
};
const SecretsSchema = schema.object(secretSchemaProps, {
  validate: (secrets) => {
    // user and password must be set together (or not at all)
    if (!secrets.password && !secrets.user) return;
    if (secrets.password && secrets.user) return;
    return i18n.translate('xpack.actions.builtin.xmatters.invalidUsernamePassword', {
      defaultMessage: 'both user and password must be specified',
    });
  },
});

// params definition
export type ActionParamsType = TypeOf<typeof ParamsSchema>;
const ParamsSchema = schema.object({
  alertActionGroup: schema.maybe(schema.string()),
  alertActionGroupName: schema.maybe(schema.string()),
  alertId: schema.maybe(schema.string()),
  alertInstanceId: schema.maybe(schema.string()),
  alertName: schema.maybe(schema.string()),
  date: schema.maybe(schema.string()),
  severity: schema.maybe(schema.string()),
  spaceId: schema.maybe(schema.string()),
  tags: schema.maybe(schema.string()),
});

export const ActionTypeId = '.xmatters';
// action type definition
export function getActionType({
  logger,
  configurationUtilities,
}: {
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
}): XmattersActionType {
  return {
    id: ActionTypeId,
    minimumLicenseRequired: 'gold',
    name: i18n.translate('xpack.actions.builtin.xmattersTitle', {
      defaultMessage: 'xMatters',
    }),
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

function renderParameterTemplates(params: ActionParamsType): ActionParamsType {
  return params;
}

function validateActionTypeConfig(
  configurationUtilities: ActionsConfigurationUtilities,
  configObject: ActionTypeConfigType
): string | undefined {
  const configuredUrl = configObject.url;
  try {
    new URL(configuredUrl);
  } catch (err) {
    return i18n.translate('xpack.actions.builtin.xmatters.xmattersConfigurationErrorNoHostname', {
      defaultMessage: 'error configuring xmatters action: unable to parse url: {err}',
      values: {
        err,
      },
    });
  }

  try {
    configurationUtilities.ensureUriAllowed(configuredUrl);
  } catch (allowListError) {
    return i18n.translate('xpack.actions.builtin.xmatters.xmattersConfigurationError', {
      defaultMessage: 'error configuring xmatters action: {message}',
      values: {
        message: allowListError.message,
      },
    });
  }
}

// action executor
export async function executor(
  {
    logger,
    configurationUtilities,
  }: { logger: Logger; configurationUtilities: ActionsConfigurationUtilities },
  execOptions: XmattersActionTypeExecutorOptions
): Promise<ActionTypeExecutorResult<unknown>> {
  const actionId = execOptions.actionId;
  const { url, hasAuth } = execOptions.config;
  const data = getPayloadForRequest(execOptions.params);

  const secrets: ActionTypeSecretsType = execOptions.secrets;
  const basicAuth =
    hasAuth && isString(secrets.user) && isString(secrets.password)
      ? { auth: { username: secrets.user, password: secrets.password } }
      : {};

  let result: Result<AxiosResponse, AxiosError>;
  try {
    result = await postXmatters({ url, data, basicAuth }, logger, configurationUtilities);
  } catch (err) {
    const message = i18n.translate('xpack.actions.builtin.xmatters.postingErrorMessage', {
      defaultMessage: 'error triggering xMatters workflow',
    });
    logger.warn(`error thrown triggering xMatters workflow: ${err.message}`);
    return {
      status: 'error',
      actionId,
      message,
      serviceMessage: err.message,
    };
  }

  if (isOk(result)) {
    const {
      value: { status, statusText },
    } = result;
    logger.debug(`response from xmatters action "${actionId}": [HTTP ${status}] ${statusText}`);

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
      logger.error(`error on ${actionId} xmatters event: ${message}`);
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
      logger.error(`error on ${actionId} xmatters event: ${message}`);
      return errorResultRequestFailed(actionId, message);
    } else if (error.isAxiosError) {
      const message = `${error.message}`;
      logger.error(`error on ${actionId} xmatters event: ${message}`);
      return errorResultRequestFailed(actionId, message);
    }

    logger.error(`error on ${actionId} xmatters action: unexpected error`);
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
  const errMessage = i18n.translate('xpack.actions.builtin.xmatters.invalidResponseErrorMessage', {
    defaultMessage: 'error calling xmatters, invalid response',
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
  const errMessage = i18n.translate('xpack.actions.builtin.xmatters.requestFailedErrorMessage', {
    defaultMessage: 'error calling xmatters, request failed',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
    serviceMessage,
  };
}

function errorResultUnexpectedError(actionId: string): ActionTypeExecutorResult<void> {
  const errMessage = i18n.translate('xpack.actions.builtin.xmatters.unreachableErrorMessage', {
    defaultMessage: 'error calling xmatters, unexpected error',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
  };
}

function retryResult(actionId: string, serviceMessage: string): ActionTypeExecutorResult<void> {
  const errMessage = i18n.translate(
    'xpack.actions.builtin.xmatters.invalidResponseRetryLaterErrorMessage',
    {
      defaultMessage: 'error calling xmatters, retry later',
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
    'xpack.actions.builtin.xmatters.invalidResponseRetryDateErrorMessage',
    {
      defaultMessage: 'error calling xmatters, retry at {retryString}',
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

interface XmattersPayload {
  alertActionGroup: string;
  alertActionGroupName: string;
  alertId: string;
  alertInstanceId: string;
  alertName: string;
  date: string;
  severity: string;
  spaceId: string;
  tags: string;
}

function getPayloadForRequest(params: ActionParamsType): XmattersPayload {
  const data: XmattersPayload = {
    alertActionGroup: params.alertActionGroup,
    alertActionGroupName: params.alertActionGroupName,
    alertId: params.alertId,
    alertInstanceId: params.alertInstanceId,
    alertName: params.alertName,
    date: params.date,
    severity: params.severity || 'High',
    spaceId: params.spaceId,
    tags: params.tags,
  };

  return data;
}
