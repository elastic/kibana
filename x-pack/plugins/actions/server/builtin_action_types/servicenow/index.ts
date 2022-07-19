/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { curry } from 'lodash';
import { schema, TypeOf } from '@kbn/config-schema';

import { Logger } from '@kbn/core/server';
import { validate } from './validators';
import {
  ExternalIncidentServiceConfiguration,
  ExternalIncidentServiceConfigurationBase,
  ExternalIncidentServiceSecretConfiguration,
  ExecutorParamsSchemaITSM,
  ExecutorParamsSchemaSIR,
  ExecutorParamsSchemaITOM,
} from './schema';
import { ActionsConfigurationUtilities } from '../../actions_config';
import { ActionType, ActionTypeExecutorOptions, ActionTypeExecutorResult } from '../../types';
import { createExternalService } from './service';
import { api as commonAPI } from './api';
import * as i18n from './translations';
import {
  ExecutorParams,
  ExecutorSubActionPushParams,
  ServiceNowPublicConfigurationType,
  ServiceNowSecretConfigurationType,
  PushToServiceResponse,
  ExecutorSubActionCommonFieldsParams,
  ServiceNowExecutorResultData,
  ExecutorSubActionGetChoicesParams,
  ServiceFactory,
  ExternalServiceAPI,
  ExecutorParamsITOM,
  ExecutorSubActionAddEventParams,
  ExternalServiceApiITOM,
  ExternalServiceITOM,
  ServiceNowPublicConfigurationBaseType,
  ExternalService,
} from './types';
import {
  ServiceNowITOMActionTypeId,
  ServiceNowITSMActionTypeId,
  serviceNowITSMTable,
  ServiceNowSIRActionTypeId,
  serviceNowSIRTable,
  snExternalServiceConfig,
} from './config';
import { createExternalServiceSIR } from './service_sir';
import { apiSIR } from './api_sir';
import { throwIfSubActionIsNotSupported } from './utils';
import { createExternalServiceITOM } from './service_itom';
import { apiITOM } from './api_itom';
import { createServiceWrapper } from './create_service_wrapper';
import {
  AlertingConnectorFeatureId,
  CasesConnectorFeatureId,
  UptimeConnectorFeatureId,
  SecurityConnectorFeatureId,
} from '../../../common';

export {
  ServiceNowITSMActionTypeId,
  serviceNowITSMTable,
  ServiceNowSIRActionTypeId,
  serviceNowSIRTable,
  ServiceNowITOMActionTypeId,
};

export type ActionParamsType =
  | TypeOf<typeof ExecutorParamsSchemaITSM>
  | TypeOf<typeof ExecutorParamsSchemaSIR>;

interface GetActionTypeParams {
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
}

export type ServiceNowActionType<
  C extends Record<string, unknown> = ServiceNowPublicConfigurationBaseType,
  T extends Record<string, unknown> = ExecutorParams
> = ActionType<C, ServiceNowSecretConfigurationType, T, PushToServiceResponse | {}>;

export type ServiceNowActionTypeExecutorOptions<
  C extends Record<string, unknown> = ServiceNowPublicConfigurationBaseType,
  T extends Record<string, unknown> = ExecutorParams
> = ActionTypeExecutorOptions<C, ServiceNowSecretConfigurationType, T>;

// action type definition
export function getServiceNowITSMActionType(
  params: GetActionTypeParams
): ServiceNowActionType<ServiceNowPublicConfigurationType, ExecutorParams> {
  const { logger, configurationUtilities } = params;
  return {
    id: ServiceNowITSMActionTypeId,
    minimumLicenseRequired: 'platinum',
    name: i18n.SERVICENOW_ITSM,
    supportedFeatureIds: [
      AlertingConnectorFeatureId,
      CasesConnectorFeatureId,
      UptimeConnectorFeatureId,
      SecurityConnectorFeatureId,
    ],
    validate: {
      config: schema.object(ExternalIncidentServiceConfiguration, {
        validate: curry(validate.config)(configurationUtilities),
      }),
      secrets: schema.object(ExternalIncidentServiceSecretConfiguration, {
        validate: curry(validate.secrets)(configurationUtilities),
      }),
      connector: validate.connector,
      params: ExecutorParamsSchemaITSM,
    },
    executor: curry(executor)({
      logger,
      configurationUtilities,
      actionTypeId: ServiceNowITSMActionTypeId,
      createService: createExternalService,
      api: commonAPI,
    }),
  };
}

export function getServiceNowSIRActionType(
  params: GetActionTypeParams
): ServiceNowActionType<ServiceNowPublicConfigurationType, ExecutorParams> {
  const { logger, configurationUtilities } = params;
  return {
    id: ServiceNowSIRActionTypeId,
    minimumLicenseRequired: 'platinum',
    name: i18n.SERVICENOW_SIR,
    supportedFeatureIds: [
      AlertingConnectorFeatureId,
      CasesConnectorFeatureId,
      SecurityConnectorFeatureId,
    ],
    validate: {
      config: schema.object(ExternalIncidentServiceConfiguration, {
        validate: curry(validate.config)(configurationUtilities),
      }),
      secrets: schema.object(ExternalIncidentServiceSecretConfiguration, {
        validate: curry(validate.secrets)(configurationUtilities),
      }),
      connector: validate.connector,
      params: ExecutorParamsSchemaSIR,
    },
    executor: curry(executor)({
      logger,
      configurationUtilities,
      actionTypeId: ServiceNowSIRActionTypeId,
      createService: createExternalServiceSIR,
      api: apiSIR,
    }),
  };
}

export function getServiceNowITOMActionType(
  params: GetActionTypeParams
): ServiceNowActionType<ServiceNowPublicConfigurationBaseType, ExecutorParamsITOM> {
  const { logger, configurationUtilities } = params;
  return {
    id: ServiceNowITOMActionTypeId,
    minimumLicenseRequired: 'platinum',
    name: i18n.SERVICENOW_ITOM,
    supportedFeatureIds: [AlertingConnectorFeatureId, SecurityConnectorFeatureId],
    validate: {
      config: schema.object(ExternalIncidentServiceConfigurationBase, {
        validate: curry(validate.config)(configurationUtilities),
      }),
      secrets: schema.object(ExternalIncidentServiceSecretConfiguration, {
        validate: curry(validate.secrets)(configurationUtilities),
      }),
      connector: validate.connector,
      params: ExecutorParamsSchemaITOM,
    },
    executor: curry(executorITOM)({
      logger,
      configurationUtilities,
      actionTypeId: ServiceNowITOMActionTypeId,
      createService: createExternalServiceITOM,
      api: apiITOM,
    }),
  };
}

// action executor
const supportedSubActions: string[] = ['getFields', 'pushToService', 'getChoices', 'getIncident'];
async function executor(
  {
    logger,
    configurationUtilities,
    actionTypeId,
    createService,
    api,
  }: {
    logger: Logger;
    configurationUtilities: ActionsConfigurationUtilities;
    actionTypeId: string;
    createService: ServiceFactory;
    api: ExternalServiceAPI;
  },
  execOptions: ServiceNowActionTypeExecutorOptions<
    ServiceNowPublicConfigurationType,
    ExecutorParams
  >
): Promise<ActionTypeExecutorResult<ServiceNowExecutorResultData | {}>> {
  const { actionId, config, params, secrets, services } = execOptions;
  const { subAction, subActionParams } = params;
  const connectorTokenClient = services.connectorTokenClient;
  const externalServiceConfig = snExternalServiceConfig[actionTypeId];
  let data: ServiceNowExecutorResultData | null = null;

  const externalService = createServiceWrapper<ExternalService>({
    connectorId: actionId,
    credentials: {
      config,
      secrets,
    },
    logger,
    configurationUtilities,
    serviceConfig: externalServiceConfig,
    connectorTokenClient,
    createServiceFn: createService,
  });

  const apiAsRecord = api as unknown as Record<string, unknown>;
  throwIfSubActionIsNotSupported({ api: apiAsRecord, subAction, supportedSubActions, logger });

  if (subAction === 'pushToService') {
    const pushToServiceParams = subActionParams as ExecutorSubActionPushParams;
    data = await api.pushToService({
      externalService,
      params: pushToServiceParams,
      config,
      secrets,
      logger,
      commentFieldKey: externalServiceConfig.commentFieldKey,
    });

    logger.debug(`response push to service for incident id: ${data.id}`);
  }

  if (subAction === 'getFields') {
    const getFieldsParams = subActionParams as ExecutorSubActionCommonFieldsParams;
    data = await api.getFields({
      externalService,
      params: getFieldsParams,
      logger,
    });
  }

  if (subAction === 'getChoices') {
    const getChoicesParams = subActionParams as ExecutorSubActionGetChoicesParams;
    data = await api.getChoices({
      externalService,
      params: getChoicesParams,
      logger,
    });
  }

  return { status: 'ok', data: data ?? {}, actionId };
}

const supportedSubActionsITOM = ['addEvent', 'getChoices'];

async function executorITOM(
  {
    logger,
    configurationUtilities,
    actionTypeId,
    createService,
    api,
  }: {
    logger: Logger;
    configurationUtilities: ActionsConfigurationUtilities;
    actionTypeId: string;
    createService: ServiceFactory<ExternalServiceITOM>;
    api: ExternalServiceApiITOM;
  },
  execOptions: ServiceNowActionTypeExecutorOptions<
    ServiceNowPublicConfigurationBaseType,
    ExecutorParamsITOM
  >
): Promise<ActionTypeExecutorResult<ServiceNowExecutorResultData | {}>> {
  const { actionId, config, params, secrets } = execOptions;
  const { subAction, subActionParams } = params;
  const connectorTokenClient = execOptions.services.connectorTokenClient;
  const externalServiceConfig = snExternalServiceConfig[actionTypeId];
  let data: ServiceNowExecutorResultData | null = null;

  const externalService = createServiceWrapper<ExternalServiceITOM>({
    connectorId: actionId,
    credentials: {
      config,
      secrets,
    },
    logger,
    configurationUtilities,
    serviceConfig: externalServiceConfig,
    connectorTokenClient,
    createServiceFn: createService,
  });

  const apiAsRecord = api as unknown as Record<string, unknown>;

  throwIfSubActionIsNotSupported({
    api: apiAsRecord,
    subAction,
    supportedSubActions: supportedSubActionsITOM,
    logger,
  });

  if (subAction === 'addEvent') {
    const eventParams = subActionParams as ExecutorSubActionAddEventParams;
    await api.addEvent({
      externalService,
      params: eventParams,
      logger,
    });
  }

  if (subAction === 'getChoices') {
    const getChoicesParams = subActionParams as ExecutorSubActionGetChoicesParams;
    data = await api.getChoices({
      externalService,
      params: getChoicesParams,
      logger,
    });
  }

  return { status: 'ok', data: data ?? {}, actionId };
}
