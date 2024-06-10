/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isString } from 'lodash';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { schema, TypeOf } from '@kbn/config-schema';
import { Logger } from '@kbn/core/server';
import { pipe } from 'fp-ts/lib/pipeable';
import { map, getOrElse } from 'fp-ts/lib/Option';
import type {
  ActionType as ConnectorType,
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
  ValidatorServices,
} from '@kbn/actions-plugin/server/types';
import { request } from '@kbn/actions-plugin/server/lib/axios_utils';
import {
  AlertingConnectorFeatureId,
  UptimeConnectorFeatureId,
  SecurityConnectorFeatureId,
} from '@kbn/actions-plugin/common/types';
import { renderMustacheString } from '@kbn/actions-plugin/server/lib/mustache_renderer';
import { combineHeadersWithBasicAuthHeader } from '@kbn/actions-plugin/server/lib';
import { SSLCertType, WebhookAuthType } from '../../../common/webhook/constants';
import { getRetryAfterIntervalFromHeaders } from '../lib/http_response_retry_header';
import { nullableType } from '../lib/nullable';
import { isOk, promiseResult, Result } from '../lib/result_type';

// config definition
export enum WebhookMethods {
  POST = 'post',
  PUT = 'put',
}

export type WebhookConnectorType = ConnectorType<
  ConnectorTypeConfigType,
  ConnectorTypeSecretsType,
  ActionParamsType,
  unknown
>;
export type WebhookConnectorTypeExecutorOptions = ConnectorTypeExecutorOptions<
  ConnectorTypeConfigType,
  ConnectorTypeSecretsType,
  ActionParamsType
>;

const HeadersSchema = schema.recordOf(schema.string(), schema.string());
const configSchemaProps = {
  url: schema.string(),
  method: schema.oneOf([schema.literal(WebhookMethods.POST), schema.literal(WebhookMethods.PUT)], {
    defaultValue: WebhookMethods.POST,
  }),
  headers: nullableType(HeadersSchema),
  hasAuth: schema.boolean({ defaultValue: true }),
  authType: schema.maybe(
    schema.oneOf(
      [
        schema.literal(WebhookAuthType.Basic),
        schema.literal(WebhookAuthType.SSL),
        schema.literal(null),
      ],
      {
        defaultValue: WebhookAuthType.Basic,
      }
    )
  ),
  certType: schema.maybe(
    schema.oneOf([schema.literal(SSLCertType.CRT), schema.literal(SSLCertType.PFX)])
  ),
  ca: schema.maybe(schema.string()),
  verificationMode: schema.maybe(
    schema.oneOf([schema.literal('none'), schema.literal('certificate'), schema.literal('full')])
  ),
};
const ConfigSchema = schema.object(configSchemaProps);
export type ConnectorTypeConfigType = TypeOf<typeof ConfigSchema>;

// secrets definition
export type ConnectorTypeSecretsType = TypeOf<typeof SecretsSchema>;
const secretSchemaProps = {
  user: schema.nullable(schema.string()),
  password: schema.nullable(schema.string()),
  crt: schema.nullable(schema.string()),
  key: schema.nullable(schema.string()),
  pfx: schema.nullable(schema.string()),
};
const SecretsSchema = schema.object(secretSchemaProps, {
  validate: (secrets) => {
    // user and password must be set together (or not at all)
    if (!secrets.password && !secrets.user && !secrets.crt && !secrets.key && !secrets.pfx) return;
    if (secrets.password && secrets.user && !secrets.crt && !secrets.key && !secrets.pfx) return;
    if (secrets.crt && secrets.key && !secrets.user && !secrets.pfx) return;
    if (!secrets.crt && !secrets.key && !secrets.user && secrets.pfx) return;
    return i18n.translate('xpack.stackConnectors.webhook.invalidUsernamePassword', {
      defaultMessage:
        'must specify one of the following schemas: user and password; crt and key (with optional password); or pfx (with optional password)',
    });
  },
});

// params definition
export type ActionParamsType = TypeOf<typeof ParamsSchema>;
export const ParamsSchema = schema.object({
  body: schema.maybe(schema.string()),
});

export const ConnectorTypeId = '.webhook';
// connector type definition
export function getConnectorType(): WebhookConnectorType {
  return {
    id: ConnectorTypeId,
    minimumLicenseRequired: 'gold',
    name: i18n.translate('xpack.stackConnectors.webhook.title', {
      defaultMessage: 'Webhook',
    }),
    supportedFeatureIds: [
      AlertingConnectorFeatureId,
      UptimeConnectorFeatureId,
      SecurityConnectorFeatureId,
    ],
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
  logger: Logger,
  params: ActionParamsType,
  variables: Record<string, unknown>
): ActionParamsType {
  if (!params.body) return params;
  return {
    body: renderMustacheString(logger, params.body, variables, 'json'),
  };
}

function validateConnectorTypeConfig(
  configObject: ConnectorTypeConfigType,
  validatorServices: ValidatorServices
) {
  const { configurationUtilities } = validatorServices;
  const configuredUrl = configObject.url;
  try {
    new URL(configuredUrl);
  } catch (err) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.webhook.configurationErrorNoHostname', {
        defaultMessage: 'error configuring webhook action: unable to parse url: {err}',
        values: {
          err: err.toString(),
        },
      })
    );
  }

  try {
    configurationUtilities.ensureUriAllowed(configuredUrl);
  } catch (allowListError) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.webhook.configurationError', {
        defaultMessage: 'error configuring webhook action: {message}',
        values: {
          message: allowListError.message,
        },
      })
    );
  }

  if (Boolean(configObject.authType) && !configObject.hasAuth) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.webhook.authConfigurationError', {
        defaultMessage:
          'error configuring webhook action: authType must be null or undefined if hasAuth is false',
      })
    );
  }
}

// action executor
export async function executor(
  execOptions: WebhookConnectorTypeExecutorOptions
): Promise<ConnectorTypeExecutorResult<unknown>> {
  const { actionId, config, params, configurationUtilities, logger } = execOptions;
  const { method, url, headers = {}, hasAuth, authType, ca, verificationMode } = config;
  const { body: data } = params;

  const secrets: ConnectorTypeSecretsType = execOptions.secrets;
  // For backwards compatibility with connectors created before authType was added, interpret a
  // hasAuth: true and undefined authType as basic auth
  const basicAuth =
    hasAuth &&
    (authType === WebhookAuthType.Basic || !authType) &&
    isString(secrets.user) &&
    isString(secrets.password)
      ? { auth: { username: secrets.user, password: secrets.password } }
      : {};

  const sslCertificate =
    authType === WebhookAuthType.SSL &&
    ((isString(secrets.crt) && isString(secrets.key)) || isString(secrets.pfx))
      ? isString(secrets.pfx)
        ? {
            pfx: Buffer.from(secrets.pfx, 'base64'),
            ...(isString(secrets.password) ? { passphrase: secrets.password } : {}),
          }
        : {
            cert: Buffer.from(secrets.crt!, 'base64'),
            key: Buffer.from(secrets.key!, 'base64'),
            ...(isString(secrets.password) ? { passphrase: secrets.password } : {}),
          }
      : {};

  const axiosInstance = axios.create();

  const sslOverrides = {
    ...sslCertificate,
    ...(verificationMode ? { verificationMode } : {}),
    ...(ca ? { ca: Buffer.from(ca, 'base64') } : {}),
  };

  const headersWithBasicAuth = combineHeadersWithBasicAuthHeader({
    username: basicAuth.auth?.username,
    password: basicAuth.auth?.password,
    headers,
  });

  const result: Result<AxiosResponse, AxiosError<{ message: string }>> = await promiseResult(
    request({
      axios: axiosInstance,
      method,
      url,
      logger,
      headers: headersWithBasicAuth,
      data,
      configurationUtilities,
      sslOverrides,
    })
  );

  if (result == null) {
    return errorResultUnexpectedNullResponse(actionId);
  }

  if (isOk(result)) {
    const {
      value: { status, statusText },
    } = result;
    logger.debug(`response from webhook action "${actionId}": [HTTP ${status}] ${statusText}`);

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
      logger.error(`error on ${actionId} webhook event: ${message}`);
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
      logger.error(`error on ${actionId} webhook event: ${message}`);
      return errorResultRequestFailed(actionId, message);
    } else if (error.isAxiosError) {
      const message = `${error.message}`;
      logger.error(`error on ${actionId} webhook event: ${message}`);
      return errorResultRequestFailed(actionId, message);
    }

    logger.error(`error on ${actionId} webhook action: unexpected error`);
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
  const errMessage = i18n.translate('xpack.stackConnectors.webhook.invalidResponseErrorMessage', {
    defaultMessage: 'error calling webhook, invalid response',
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
  const errMessage = i18n.translate('xpack.stackConnectors.webhook.requestFailedErrorMessage', {
    defaultMessage: 'error calling webhook, request failed',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
    serviceMessage,
  };
}

function errorResultUnexpectedError(actionId: string): ConnectorTypeExecutorResult<void> {
  const errMessage = i18n.translate('xpack.stackConnectors.webhook.unreachableErrorMessage', {
    defaultMessage: 'error calling webhook, unexpected error',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
  };
}

function errorResultUnexpectedNullResponse(actionId: string): ConnectorTypeExecutorResult<void> {
  const message = i18n.translate(
    'xpack.stackConnectors.webhook.unexpectedNullResponseErrorMessage',
    {
      defaultMessage: 'unexpected null response from webhook',
    }
  );
  return {
    status: 'error',
    actionId,
    message,
  };
}

function retryResult(actionId: string, serviceMessage: string): ConnectorTypeExecutorResult<void> {
  const errMessage = i18n.translate(
    'xpack.stackConnectors.webhook.invalidResponseRetryLaterErrorMessage',
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
): ConnectorTypeExecutorResult<void> {
  const retryEpoch = Date.now() + retryAfter * 1000;
  const retry = new Date(retryEpoch);
  const retryString = retry.toISOString();
  const errMessage = i18n.translate(
    'xpack.stackConnectors.webhook.invalidResponseRetryDateErrorMessage',
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
