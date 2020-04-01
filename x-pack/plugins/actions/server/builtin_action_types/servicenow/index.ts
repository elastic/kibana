/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { curry, isEmpty } from 'lodash';
import { schema } from '@kbn/config-schema';
import {
  ActionType,
  ActionTypeExecutorOptions,
  ActionTypeExecutorResult,
  ExecutorType,
} from '../../types';
import { ActionsConfigurationUtilities } from '../../actions_config';
import { ServiceNow } from './lib';

import * as i18n from './translations';

import { ACTION_TYPE_ID } from './constants';
import { ConfigType, SecretsType, Comment, ExecutorParams } from './types';

import { ConfigSchemaProps, SecretsSchemaProps, ParamsSchema } from './schema';

import { buildMap, mapParams } from './helpers';
import { handleIncident } from './action_handlers';

function validateConfig(
  configurationUtilities: ActionsConfigurationUtilities,
  configObject: ConfigType
) {
  try {
    if (isEmpty(configObject.casesConfiguration.mapping)) {
      return i18n.MAPPING_EMPTY;
    }

    configurationUtilities.ensureWhitelistedUri(configObject.apiUrl);
  } catch (whitelistError) {
    return i18n.WHITE_LISTED_ERROR(whitelistError.message);
  }
}

function validateSecrets(
  configurationUtilities: ActionsConfigurationUtilities,
  secrets: SecretsType
) {}

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
    minimumLicenseRequired: 'platinum',
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
    casesConfiguration: { mapping: configurationMapping },
  } = execOptions.config as ConfigType;
  const { username, password } = execOptions.secrets as SecretsType;
  const params = execOptions.params as ExecutorParams;
  const { comments, incidentId, ...restParams } = params;

  const mapping = buildMap(configurationMapping);
  const incident = mapParams(restParams, mapping);
  const serviceNow = new ServiceNow({ url: apiUrl, username, password });

  const handlerInput = {
    incidentId,
    serviceNow,
    params: { ...params, incident },
    comments: comments as Comment[],
    mapping,
  };

  const res: Pick<ActionTypeExecutorResult, 'status'> &
    Pick<ActionTypeExecutorResult, 'actionId'> = {
    status: 'ok',
    actionId,
  };

  const data = await handleIncident(handlerInput);

  return {
    ...res,
    data,
  };
}
