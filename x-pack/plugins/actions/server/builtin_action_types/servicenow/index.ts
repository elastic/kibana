/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { curry } from 'lodash';
import { schema } from '@kbn/config-schema';
import {
  ActionType,
  ActionTypeExecutorOptions,
  ActionTypeExecutorResult,
  ExecutorType,
} from '../../types';
import { ActionsConfigurationUtilities } from '../../actions_config';
import { ServiceNow } from '../lib/servicenow';

import * as i18n from './translations';

import { ACTION_TYPE_ID } from './constants';
import { ConfigType, SecretsType, ParamsType, CommentType } from './types';

import { ConfigSchemaProps, SecretsSchemaProps, ParamsSchema } from './schema';

import { buildMap, mapParams } from './helpers';
import { handleCreateIncident, handleUpdateIncident } from './action_handlers';

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
  const {
    apiUrl,
    casesConfiguration: { closure, mapping },
  } = execOptions.config as ConfigType;
  const { username, password } = execOptions.secrets as SecretsType;
  const params = execOptions.params as ParamsType;
  const { comments, executorAction, incidentId, ...restParams } = params;

  const finalMap = buildMap(mapping);
  const restMapped = mapParams(restParams, finalMap);
  const serviceNow = new ServiceNow({ url: apiUrl, username, password });

  const handlerInput = {
    serviceNow,
    params: restMapped,
    comments: comments as CommentType[],
    mapping: finalMap,
  };

  const res: Pick<ActionTypeExecutorResult, 'status'> &
    Pick<ActionTypeExecutorResult, 'actionId'> = {
    status: 'ok',
    actionId,
  };

  let data = {};

  switch (executorAction) {
    case 'newIncident':
      data = await handleCreateIncident(handlerInput);

      return {
        ...res,
        data,
      };

    case 'updateIncident':
      if (!incidentId) {
        throw new Error('[Action][ServiceNow]: IncidentId is required.');
      }

      await handleUpdateIncident({ incidentId, ...handlerInput });
      return {
        ...res,
      };
    default:
      return {
        ...res,
        serviceMessage: '[Action][ServiceNow]: Unimplemented executor action.',
      };
  }
}
