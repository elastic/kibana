/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { curry } from 'lodash';
import { schema, TypeOf } from '@kbn/config-schema';

import { validate } from './validators';
import {
  ExternalIncidentServiceConfiguration,
  ExternalIncidentServiceSecretConfiguration,
  ExecutorParamsSchemaITSM,
  ExecutorParamsSchemaSIR,
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
  ExecutorSubActionGetChoicesParams,
} from './types';

export type ActionParamsType =
  | TypeOf<typeof ExecutorParamsSchemaITSM>
  | TypeOf<typeof ExecutorParamsSchemaSIR>;

interface GetActionTypeParams {
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
}

const serviceNowITSMTable = 'incident';
const serviceNowSIRTable = 'sn_si_incident';

export const ServiceNowITSMActionTypeId = '.servicenow';
export const ServiceNowSIRActionTypeId = '.servicenow-sir';

// action type definition
export function getServiceNowITSMActionType(
  params: GetActionTypeParams
): ActionType<
  ServiceNowPublicConfigurationType,
  ServiceNowSecretConfigurationType,
  ExecutorParams,
  PushToServiceResponse | {}
> {
  const { logger, configurationUtilities } = params;
  return {
    id: ServiceNowITSMActionTypeId,
    minimumLicenseRequired: 'platinum',
    name: i18n.SERVICENOW_ITSM,
    validate: {
      config: schema.object(ExternalIncidentServiceConfiguration, {
        validate: curry(validate.config)(configurationUtilities),
      }),
      secrets: schema.object(ExternalIncidentServiceSecretConfiguration, {
        validate: curry(validate.secrets)(configurationUtilities),
      }),
      params: ExecutorParamsSchemaITSM,
    },
    executor: curry(executor)({ logger, configurationUtilities, table: serviceNowITSMTable }),
  };
}

export function getServiceNowSIRActionType(
  params: GetActionTypeParams
): ActionType<
  ServiceNowPublicConfigurationType,
  ServiceNowSecretConfigurationType,
  ExecutorParams,
  PushToServiceResponse | {}
> {
  const { logger, configurationUtilities } = params;
  return {
    id: ServiceNowSIRActionTypeId,
    minimumLicenseRequired: 'platinum',
    name: i18n.SERVICENOW_SIR,
    validate: {
      config: schema.object(ExternalIncidentServiceConfiguration, {
        validate: curry(validate.config)(configurationUtilities),
      }),
      secrets: schema.object(ExternalIncidentServiceSecretConfiguration, {
        validate: curry(validate.secrets)(configurationUtilities),
      }),
      params: ExecutorParamsSchemaSIR,
    },
    executor: curry(executor)({ logger, configurationUtilities, table: serviceNowSIRTable }),
  };
}

// action executor
const supportedSubActions: string[] = ['getFields', 'pushToService', 'getChoices', 'getIncident'];
async function executor(
  {
    logger,
    configurationUtilities,
    table,
  }: { logger: Logger; configurationUtilities: ActionsConfigurationUtilities; table: string },
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
    table,
    {
      config,
      secrets,
    },
    logger,
    configurationUtilities
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

  if (subAction === 'getChoices') {
    const getChoicesParams = subActionParams as ExecutorSubActionGetChoicesParams;
    data = await api.getChoices({
      externalService,
      params: getChoicesParams,
    });
  }

  return { status: 'ok', data: data ?? {}, actionId };
}
