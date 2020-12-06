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
import * as i18n from './translations';
import { Logger } from '../../../../../../src/core/server';
import {
  ExecutorParams,
  ExecutorSubActionPushParams,
  ServiceNowPublicConfigurationType,
  ServiceNowSecretConfigurationType,
  PushToServiceResponse,
  ExecutorSubActionCommonFieldsParams,
  ServiceNowExecutorResultData,
} from './types';

// TODO: to remove, need to support Case
import { buildMap, mapParams } from '../case/utils';

interface GetActionTypeParams {
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
}

// action type definition
export function getActionType(
  params: GetActionTypeParams
): ActionType<
  ServiceNowPublicConfigurationType,
  ServiceNowSecretConfigurationType,
  ExecutorParams,
  PushToServiceResponse | {}
> {
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
      params: ExecutorParamsSchema,
    },
    executor: curry(executor)({ logger }),
  };
}

// action executor
const supportedSubActions: string[] = ['getFields', 'pushToService'];
async function executor(
  { logger }: { logger: Logger },
  execOptions: ActionTypeExecutorOptions<
    ServiceNowPublicConfigurationType,
    ServiceNowSecretConfigurationType,
    ExecutorParams
  >
): Promise<ActionTypeExecutorResult<ServiceNowExecutorResultData | {}>> {
  const { actionId, config, params, secrets } = execOptions;
  const { subAction, subActionParams } = params;
  let data: ServiceNowExecutorResultData | null = null;

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

    const { comments, externalId, ...restParams } = pushToServiceParams;
    const incidentConfiguration = config.incidentConfiguration;
    const mapping = incidentConfiguration ? buildMap(incidentConfiguration.mapping) : null;
    const externalObject =
      config.incidentConfiguration && mapping ? mapParams(restParams, mapping) : {};

    data = await api.pushToService({
      externalService,
      mapping,
      params: { ...pushToServiceParams, externalObject },
      secrets,
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

  return { status: 'ok', data: data ?? {}, actionId };
}
