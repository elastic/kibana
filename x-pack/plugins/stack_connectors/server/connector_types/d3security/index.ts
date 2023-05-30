import { i18n } from '@kbn/i18n';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { schema, TypeOf } from '@kbn/config-schema';
import { pipe } from 'fp-ts/lib/pipeable';
import { map, getOrElse } from 'fp-ts/lib/Option';
import { getRetryAfterIntervalFromHeaders } from '../lib/http_response_retry_header';
import { isOk, promiseResult, Result } from '../lib/result_type';
import {  ActionType as ConnectorType,
          ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
          ActionTypeExecutorResult as ConnectorTypeExecutorResult,
          ValidatorServices} from '@kbn/actions-plugin/server/types';
import { request } from '@kbn/actions-plugin/server/lib/axios_utils';
import { renderMustacheString } from '@kbn/actions-plugin/server/lib/mustache_renderer';
import {
  AlertingConnectorFeatureId,
  SecurityConnectorFeatureId,
} from '@kbn/actions-plugin/common/types';


// config definition
export enum D3SecuritySeverity {
  EMPTY = '',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}


export type D3SecurityConnectorType = ConnectorType<
  ConnectorTypeConfigType,
  ConnectorTypeSecretsType,
  ActionParamsType,
  unknown
>;
export type D3SecurityConnectorTypeExecutorOptions = ConnectorTypeExecutorOptions<
  ConnectorTypeConfigType,
  ConnectorTypeSecretsType,
  ActionParamsType
>;

const configSchemaProps = {
  url: schema.string(),
  severity:  schema.string({ defaultValue: D3SecuritySeverity.EMPTY }),
  eventtype: schema.string({ defaultValue: "" }),
};
const ConfigSchema = schema.object(configSchemaProps);
export type ConnectorTypeConfigType = TypeOf<typeof ConfigSchema>;

// secrets definition
export type ConnectorTypeSecretsType = TypeOf<typeof SecretsSchema>;
const secretSchemaProps = {
    token: schema.nullable(schema.string()),
};
const SecretsSchema = schema.object(secretSchemaProps, {
  validate: (secrets) => {
    if (secrets.token ) return;
    if (!secrets.token) 
    return i18n.translate('xpack.stackConnectors.d3.invalidUrlToken', {
      defaultMessage: 'token must be specified',
    });
  },
});

// params definition
export type ActionParamsType = TypeOf<typeof ParamsSchema>;
const ParamsSchema = schema.object({
  body: schema.maybe(schema.string()),
  severity: schema.maybe(schema.string()),
  eventType:  schema.maybe(schema.string())
});

export const ConnectorTypeId = '.d3security';
// connector type definition
export function getConnectorType(): D3SecurityConnectorType {
  return {
    id: ConnectorTypeId,
    minimumLicenseRequired: 'gold',
    name: i18n.translate('xpack.stackConnectors.d3.title', {
      defaultMessage: 'D3 Security',
    }),
    supportedFeatureIds: [
      AlertingConnectorFeatureId,
      SecurityConnectorFeatureId,
    ],
    validate: {
      config: { schema: ConfigSchema,
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

function renderParameterTemplates(params: ActionParamsType, variables: Record<string, unknown>): ActionParamsType {
  let result = {...params};
  if (params.body) {
    result = {...params,body:renderMustacheString(params.body, variables, 'json') }
  }
  return result;
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
      i18n.translate('xpack.stackConnectors.d3.configurationErrorNoHostname', {
        defaultMessage: 'error configuring d3 action: unable to parse url: {err}',
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
      i18n.translate('xpack.stackConnectors.d3.configurationError', {
        defaultMessage: 'error configuring d3 action: {message}',
        values: {
          message: allowListError.message,
        },
      })
    );
  }
}

// action executor
export async function executor(
  execOptions: D3SecurityConnectorTypeExecutorOptions
): Promise<ConnectorTypeExecutorResult<unknown>> {
  const { actionId, config, params, secrets, configurationUtilities, logger} = execOptions;
  const { url } = config;
  const { token } = secrets;
  const { body:data, severity, eventType } = params;

  const axiosInstance = axios.create();
  const bodyData = addSeverityAndEventTypeInBody(String(data),String(severity),String(eventType));
  const result: Result<AxiosResponse, AxiosError<{ message: string }>> = await promiseResult(
    request({
      axios: axiosInstance,
      method:'post',
      url,
      logger,
      headers:{"d3key":token||""},
      data:bodyData,
      configurationUtilities,
    })
  );

  if (isOk(result)) {
    const {
      value: { status, statusText },
    } = result;
    logger.debug(`response from d3 action "${actionId}": [HTTP ${status}] ${statusText}`);

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
      logger.error(`error on ${actionId} d3 event: ${message}`);
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
      logger.error(`error on ${actionId} d3 event: ${message}`);
      return errorResultRequestFailed(actionId, message);
    } else if (error.isAxiosError) {
      const message = `${error.message}`;
      logger.error(`error on ${actionId} d3 event: ${message}`);
      return errorResultRequestFailed(actionId, message);
    }

    logger.error(`error on ${actionId} d3 action: unexpected error`);
    return errorResultUnexpectedError(actionId);
  }
}

function addSeverityAndEventTypeInBody(bodyString: string,severity: string,eventType: string){
  let bodyObj = bodyString;
  try{
    bodyObj = JSON.parse(bodyString);
  }catch{
  }
  const resultObj = {
    hits: {
      hits: {
        '_source': {
          'rawData': bodyObj,
          'event.type': eventType,
          'kibana.alert.severity': severity
        }
      }
    }
  }
  const result = JSON.stringify(resultObj)
  return result
}
// Action Executor Result w/ internationalisation
function successResult(actionId: string, data: unknown): ConnectorTypeExecutorResult<unknown> {
  return { status: 'ok', data, actionId };
}

function errorResultInvalid(
  actionId: string,
  serviceMessage: string
): ConnectorTypeExecutorResult<void> {
  const errMessage = i18n.translate('xpack.stackConnectors.d3.invalidResponseErrorMessage', {
    defaultMessage: 'error calling d3security, invalid response',
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
  const errMessage = i18n.translate('xpack.stackConnectors.d3.requestFailedErrorMessage', {
    defaultMessage: 'error calling d3security, request failed',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
    serviceMessage,
  };
}

function errorResultUnexpectedError(actionId: string): ConnectorTypeExecutorResult<void> {
  const errMessage = i18n.translate('xpack.stackConnectors.d3.unreachableErrorMessage', {
    defaultMessage: 'error calling d3security, unexpected error',
  });
  return {
    status: 'error',
    message: errMessage,
    actionId,
  };
}

function retryResult(actionId: string, serviceMessage: string): ConnectorTypeExecutorResult<void> {
  const errMessage = i18n.translate(
    'xpack.stackConnectors.d3.invalidResponseRetryLaterErrorMessage',
    {
      defaultMessage: 'error calling d3security, retry later',
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
    'xpack.stackConnectors.d3.invalidResponseRetryDateErrorMessage',
    {
      defaultMessage: 'error calling d3security, retry at {retryString}',
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
