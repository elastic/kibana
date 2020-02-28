/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { curry } from 'lodash';
import { schema, TypeOf } from '@kbn/config-schema';
import {
  ActionType,
  ActionTypeExecutorOptions,
  ActionTypeExecutorResult,
  ExecutorType,
} from '../../types';
import { ActionsConfigurationUtilities } from '../../actions_config';
import { postServiceNow } from '../lib/post_servicenow';

import * as i18n from './translations';

import { ACTION_TYPE_ID } from './constants';
import { ConfigType, SecretsType, ParamsType } from './types';

import { ConfigSchemaProps, SecretsSchemaProps, ParamsSchema } from './schema';

function validateConfig(
  configurationUtilities: ActionsConfigurationUtilities,
  configObject: ConfigType
) {
  if (configObject.apiUrl == null) {
    return i18n.API_URL_REQUIRED;
  }
  try {
    configurationUtilities.ensureWhitelistedUri(configObject.apiUrl);
  } catch (whitelistError) {
    return i18n.WHITE_LISTED_ERROR(whitelistError.message);
  }
}

function validateSecrets(
  configurationUtilities: ActionsConfigurationUtilities,
  secrets: SecretsType
) {
  if (secrets.username == null) {
    return i18n.NO_USERNAME;
  }
  if (secrets.password == null) {
    return i18n.NO_PASSWORD;
  }
}

// action type definition
export function getActionType({
  configurationUtilities,
  executor = serviceNowExecutor,
}: {
  configurationUtilities: ActionsConfigurationUtilities;
  executor?: ExecutorType;
}): ActionType {
  return {
    id: ACTION_TYPE_ID,
    name: i18n.NAME,
    validate: {
      config: schema.object(ConfigSchemaProps, {
        validate: curry(validateConfig)(configurationUtilities),
      }),
      secrets: schema.object(SecretsSchemaProps, {
        validate: curry(validateSecrets)(configurationUtilities),
      }),
      params: ParamsSchema,
    },
    executor,
  };
}

// action executor

async function serviceNowExecutor(
  execOptions: ActionTypeExecutorOptions
): Promise<ActionTypeExecutorResult> {
  const actionId = execOptions.actionId;
  const config = execOptions.config as ConfigType;
  const secrets = execOptions.secrets as SecretsType;
  const params = execOptions.params as ParamsType;
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  let response;
  try {
    response = await postServiceNow({ apiUrl: config.apiUrl, data: params, headers, secrets });
  } catch (err) {
    const message = i18n.ERROR_POSTING;
    return {
      status: 'error',
      actionId,
      message,
      serviceMessage: err.message,
    };
  }
  if (response.status === 200 || response.status === 201 || response.status === 204) {
    return {
      status: 'ok',
      actionId,
      data: response.data,
    };
  }

  if (response.status === 429 || response.status >= 500) {
    const message = i18n.RETRY_POSTING(response.status);

    return {
      status: 'error',
      actionId,
      message,
      retry: true,
    };
  }

  const message = i18n.UNEXPECTED_STATUS(response.status);

  return {
    status: 'error',
    actionId,
    message,
  };
}
