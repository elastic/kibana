/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { schema, TypeOf } from '@kbn/config-schema';
import { pipe } from 'fp-ts/lib/pipeable';
import { map, getOrElse } from 'fp-ts/lib/Option';
import type {
  ActionType as ConnectorType,
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
  ValidatorServices,
} from '@kbn/actions-plugin/server/types';
import { request } from '@kbn/actions-plugin/server/lib/axios_utils';
import { renderMustacheString } from '@kbn/actions-plugin/server/lib/mustache_renderer';
import { GeneralConnectorFeatureId } from '@kbn/actions-plugin/common';
import { OpenAiProviderType } from '@kbn/triggers-actions-ui-plugin/common';
import { getRetryAfterIntervalFromHeaders } from '../lib/http_response_retry_header';
import { isOk, promiseResult, Result } from '../lib/result_type';

export type GenerativeAiConnectorType = ConnectorType<
  ConnectorTypeConfigType,
  ConnectorTypeSecretsType,
  ActionParamsType,
  unknown
>;
export type GenerativeAiConnectorTypeExecutorOptions = ConnectorTypeExecutorOptions<
  ConnectorTypeConfigType,
  ConnectorTypeSecretsType,
  ActionParamsType
>;

const configSchemaProps = {
  apiProvider: schema.string(),
  apiUrl: schema.string(),
};
const ConfigSchema = schema.object(configSchemaProps);
export type ConnectorTypeConfigType = TypeOf<typeof ConfigSchema>;

// secrets definition
export type ConnectorTypeSecretsType = TypeOf<typeof SecretsSchema>;
const secretSchemaProps = {
  apiKey: schema.string(),
};
const SecretsSchema = schema.object(secretSchemaProps, {
  validate: (secrets) => {
    // user and password must be set together (or not at all)
    if (secrets.apiKey) return;
    return i18n.translate('xpack.stackConnectors.genAi.invalidUsernamePassword', {
      defaultMessage: 'API key must be specified',
    });
  },
});

// params definition
export type ActionParamsType = TypeOf<typeof ParamsSchema>;
const ParamsSchema = schema.object({
  body: schema.maybe(schema.string()),
});

export const ConnectorTypeId = '.genAi';
// connector type definition
export function getConnectorType(): GenerativeAiConnectorType {
  return {
    id: ConnectorTypeId,
    minimumLicenseRequired: 'gold',
    name: i18n.translate('xpack.stackConnectors.genAi.title', {
      defaultMessage: 'Generative AI',
    }),
    supportedFeatureIds: [GeneralConnectorFeatureId],
    validate: {
      config: {
        schema: ConfigSchema,
        customValidator: validateConnectorTypeConfig,
      },
      secrets: {
        schema: SecretsSchema,
      },
      params: {
        schema: ParamsSchema,
      },
    },
    renderParameterTemplates,
    executor,
  };
}

function renderParameterTemplates(
  params: ActionParamsType,
  variables: Record<string, unknown>
): ActionParamsType {
  if (!params.body) return params;
  return {
    body: renderMustacheString(params.body, variables, 'json'),
  };
}

function validateConnectorTypeConfig(
  configObject: ConnectorTypeConfigType,
  validatorServices: ValidatorServices
) {
  const { configurationUtilities } = validatorServices;
  const configuredUrl = configObject.apiUrl;
  try {
    new URL(configuredUrl);
  } catch (err) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.genAi.configurationErrorNoHostname', {
        defaultMessage: 'error configuring Generative AI action: unable to parse url: {err}',
        values: {
          err,
        },
      })
    );
  }

  try {
    configurationUtilities.ensureUriAllowed(configuredUrl);
  } catch (allowListError) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.genAi.configurationError', {
        defaultMessage: 'error configuring Generative AI action: {message}',
        values: {
          message: allowListError.message,
        },
      })
    );
  }
}

// action executor
export async function executor(
  execOptions: GenerativeAiConnectorTypeExecutorOptions
): Promise<ConnectorTypeExecutorResult<unknown>> {
  const { actionId, config, params, secrets, configurationUtilities, logger } = execOptions;
  const { apiUrl } = config;
  const { body: data } = params;

  const axiosInstance = axios.create();
  const responseSettings = configurationUtilities.getResponseSettings();
  console.log('config, API Provider', config.apiProvider);
  const result: Result<AxiosResponse, AxiosError<{ message: string }>> = await promiseResult(
    request({
      axios: axiosInstance,
      method: 'POST',
      url: apiUrl,
      logger,
      headers: {
        ...(config.apiProvider === OpenAiProviderType.OpenAi
          ? { Authorization: `Bearer ${secrets.apiKey}` }
          : { ['api-key']: secrets.apiKey }),
        ['content-type']: 'application/json',
      },
      data,
      configurationUtilities: {
        ...configurationUtilities,
        getResponseSettings: () => ({ ...responseSettings, timeout: 300000 }),
      },
    })
  );

  if (result == null) {
    return errorResultUnexpectedNullResponse(actionId);
  }

  if (isOk(result)) {
    const {
      value: { data: resultData, status, statusText },
    } = result;
    logger.debug(
      `response from Generative AI action "${actionId}": [HTTP ${status}] ${statusText}`
    );

    return successResult(actionId, resultData);
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
      logger.error(`error on ${actionId} Generative AI event: ${message}`);
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
      logger.error(`error on ${actionId} Generative AI event: ${message}`);
      return errorResultRequestFailed(actionId, message);
    } else if (error.isAxiosError) {
      const message = `${error.message}`;
      logger.error(`error on ${actionId} Generative AI event: ${message}`);
      return errorResultRequestFailed(actionId, message);
    }

    logger.error(`error on ${actionId} Generative AI action: unexpected error`);
    return errorResultUnexpectedError(actionId);
  }
}

// Action Executor Result w/ internationalisation
function successResult(actionId: string, data: unknown): ConnectorTypeExecutorResult<unknown> {
  return { status: 'ok', data, actionId };
}

function errorResultInvalid(
  actionId: string,
  serviceMessage: string
): ConnectorTypeExecutorResult<void> {
  const errMessage = i18n.translate('xpack.stackConnectors.genAi.invalidResponseErrorMessage', {
    defaultMessage: 'error calling Generative AI, invalid response',
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
): ConnectorTypeExecutorResult<unknown> {
  const errMessage = i18n.translate('xpack.stackConnectors.genAi.requestFailedErrorMessage', {
    defaultMessage: 'error calling Generative AI, request failed',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
    serviceMessage,
  };
}

function errorResultUnexpectedError(actionId: string): ConnectorTypeExecutorResult<void> {
  const errMessage = i18n.translate('xpack.stackConnectors.genAi.unreachableErrorMessage', {
    defaultMessage: 'error calling Generative AI, unexpected error',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
  };
}

function errorResultUnexpectedNullResponse(actionId: string): ConnectorTypeExecutorResult<void> {
  const message = i18n.translate('xpack.stackConnectors.genAi.unexpectedNullResponseErrorMessage', {
    defaultMessage: 'unexpected null response from Generative AI',
  });
  return {
    status: 'error',
    actionId,
    message,
  };
}

function retryResult(actionId: string, serviceMessage: string): ConnectorTypeExecutorResult<void> {
  const errMessage = i18n.translate(
    'xpack.stackConnectors.genAi.invalidResponseRetryLaterErrorMessage',
    {
      defaultMessage: 'error calling Generative AI, retry later',
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
): ConnectorTypeExecutorResult<void> {
  const retryEpoch = Date.now() + retryAfter * 1000;
  const retry = new Date(retryEpoch);
  const retryString = retry.toISOString();
  const errMessage = i18n.translate(
    'xpack.stackConnectors.genAi.invalidResponseRetryDateErrorMessage',
    {
      defaultMessage: 'error calling Generative AI, retry at {retryString}',
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
