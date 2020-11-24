/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { curry } from 'lodash';
import { schema } from '@kbn/config-schema';

import { validate } from './validators';
import {
  ExternalIncidentServiceConfiguration,
  ExternalIncidentServiceSecretConfiguration,
  ExecutorParamsSchema,
} from './schema';
import { ActionsConfigurationUtilities } from '../../actions_config';
import { ActionType, ActionTypeExecutorOptions, ActionTypeExecutorResult } from '../../types';
import { createExternalService } from './service';
import { api } from './api';
import {
  ExecutorParams,
  ExecutorSubActionPushParams,
  ResilientPublicConfigurationType,
  ResilientSecretConfigurationType,
  ResilientExecutorResultData,
  ExecutorSubActionGetIncidentTypesParams,
  ExecutorSubActionGetSeverityParams,
  ExecutorSubActionCommonFieldsParams,
} from './types';
import * as i18n from './translations';
import { Logger } from '../../../../../../src/core/server';

interface GetActionTypeParams {
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
}

const supportedSubActions: string[] = ['getFields', 'pushToService', 'incidentTypes', 'severity'];

// action type definition
export function getActionType(
  params: GetActionTypeParams
): ActionType<
  ResilientPublicConfigurationType,
  ResilientSecretConfigurationType,
  ExecutorParams,
  ResilientExecutorResultData | {}
> {
  const { logger, configurationUtilities } = params;
  return {
    id: '.resilient',
    minimumLicenseRequired: 'platinum',
    name: i18n.NAME,
    validate: {
      config: schema.object(ExternalIncidentServiceConfiguration, {
        validate: curry(validate.config)(configurationUtilities),
      }),
      secrets: schema.object(ExternalIncidentServiceSecretConfiguration, {
        validate: curry(validate.secrets)(configurationUtilities),
      }),
      params: ExecutorParamsSchema,
    },
    executor: curry(executor)({ logger }),
  };
}

// action executor
async function executor(
  { logger }: { logger: Logger },
  execOptions: ActionTypeExecutorOptions<
    ResilientPublicConfigurationType,
    ResilientSecretConfigurationType,
    ExecutorParams
  >
): Promise<ActionTypeExecutorResult<ResilientExecutorResultData | {}>> {
  const { actionId, config, params, secrets } = execOptions;
  const { subAction, subActionParams } = params as ExecutorParams;
  let data: ResilientExecutorResultData | null = null;

  const externalService = createExternalService(
    {
      config,
      secrets,
    },
    logger,
    execOptions.proxySettings
  );

  if (!api[subAction]) {
    const errorMessage = `[Action][ExternalService] Unsupported subAction type ${subAction}.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  if (!supportedSubActions.includes(subAction)) {
    const errorMessage = `[Action][ExternalService] subAction ${subAction} not implemented.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  if (subAction === 'pushToService') {
    const pushToServiceParams = subActionParams as ExecutorSubActionPushParams;

    data = await api.pushToService({
      externalService,
      params: pushToServiceParams,
      logger,
    });

    logger.debug(`response push to service for incident id: ${data.id}`);
  }

  if (subAction === 'getFields') {
    const getFieldsParams = subActionParams as ExecutorSubActionCommonFieldsParams;
    data = await api.getFields({
      externalService,
      params: getFieldsParams,
    });
  }

  if (subAction === 'incidentTypes') {
    const incidentTypesParams = subActionParams as ExecutorSubActionGetIncidentTypesParams;
    data = await api.incidentTypes({
      externalService,
      params: incidentTypesParams,
    });
  }

  if (subAction === 'severity') {
    const severityParams = subActionParams as ExecutorSubActionGetSeverityParams;
    data = await api.severity({
      externalService,
      params: severityParams,
    });
  }

  return { status: 'ok', data: data ?? {}, actionId };
}
