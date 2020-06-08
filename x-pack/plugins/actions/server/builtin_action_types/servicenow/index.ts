/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { curry, get } from 'lodash';
import { schema } from '@kbn/config-schema';

// import { config } from './config';
import { validate } from './validators';
import {
  ExternalIncidentServiceConfiguration,
  ExternalIncidentServiceSecretConfiguration,
  ExecutorParamsSchema,
  ExecutorSubActionPushParamsSchema,
} from './schema';
import { ActionsConfigurationUtilities } from '../../actions_config';
import { ActionType, ActionTypeExecutorOptions, ActionTypeExecutorResult } from '../../types';
import { createExternalService } from './service';
import { buildMap } from '../case/utils';
import { api } from './api';
import { ExecutorParams, ExecutorSubActionPushParams, MapRecord, AnyParams } from './types';
import * as i18n from './translations';

interface GetActionTypeParams {
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
}

// action type definition
export function getActionType(params: GetActionTypeParams): ActionType {
  const { logger, configurationUtilities } = params;
  return {
    id: '.servicenow',
    minimumLicenseRequired: 'platinum',
    name: i18n.NAME,
    validate: {
      config: schema.object(ExternalIncidentServiceConfiguration, {
        validate: curry(validate.config)(configurationUtilities),
      }),
      secrets: schema.object(ExternalIncidentServiceSecretConfiguration, {
        validate: curry(validate.secrets)(configurationUtilities),
      }),
      params: ExecutorSubActionPushParamsSchema,
    },
    executor: curry(executor)({ logger }),
  };
}

// action executor

async function executor(
  { logger }: { logger: Logger },
  execOptions: ActionTypeExecutorOptions
): Promise<ActionTypeExecutorResult> {
  const { actionId, config, params, secrets } = execOptions;
  // const { subAction, subActionParams } = params as ExecutorParams;
  let data = {};

  const res: Pick<ActionTypeExecutorResult, 'status'> &
    Pick<ActionTypeExecutorResult, 'actionId'> = {
    status: 'ok',
    actionId,
  };

  const externalService = createExternalService({
    config,
    secrets,
  });

  /* if (!api[subAction]) {
    throw new Error('[Action][ExternalService] Unsupported subAction type.');
  }

  if (subAction !== 'pushToService') {
    throw new Error('[Action][ExternalService] subAction not implemented.');
  }
  */

  const mapParams = (mapping: Map<string, MapRecord>): AnyParams => {
    return Object.keys(params).reduce((prev: AnyParams, curr: string): AnyParams => {
      const field = mapping.get(curr);
      if (field) {
        prev[field.target] = get(params, curr);
      }
      return prev;
    }, {});
  };

  // if (subAction === 'pushToService') {
  //  const pushToServiceParams = subActionParams as ExecutorSubActionPushParams;

  const mapping = config.indexConfiguration ? buildMap(config.indexConfiguration.mapping) : null;
  const externalObject = config.indexConfiguration && mapping ? mapParams(mapping) : {};

  data = await api.pushToService({
    externalService,
    mapping,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params: { ...params, externalObject } as any,
    secrets,
  });
  // }

  return {
    ...res,
    data,
  };
}
