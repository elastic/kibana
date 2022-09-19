/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { curry } from 'lodash';
import { TypeOf } from '@kbn/config-schema';

import { Logger } from '@kbn/core/server';
import type {
  ActionType as ConnectorType,
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
} from '@kbn/actions-plugin/server/types';
import {
  AlertingConnectorFeatureId,
  CasesConnectorFeatureId,
  UptimeConnectorFeatureId,
  SecurityConnectorFeatureId,
} from '@kbn/actions-plugin/common/types';
import { validate } from './validators';
import {
  ExternalIncidentServiceConfigurationSchema,
  ExternalIncidentServiceConfigurationBaseSchema,
  ExternalIncidentServiceSecretConfigurationSchema,
  ExecutorParamsSchemaITSM,
  ExecutorParamsSchemaSIR,
  ExecutorParamsSchemaITOM,
} from './schema';
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
  ServiceNowITOMConnectorTypeId,
  ServiceNowITSMConnectorTypeId,
  serviceNowITSMTable,
  ServiceNowSIRConnectorTypeId,
  serviceNowSIRTable,
  snExternalServiceConfig,
} from './config';
import { createExternalServiceSIR } from './service_sir';
import { apiSIR } from './api_sir';
import { throwIfSubActionIsNotSupported } from './utils';
import { createExternalServiceITOM } from './service_itom';
import { apiITOM } from './api_itom';
import { createServiceWrapper } from './create_service_wrapper';

export {
  ServiceNowITSMConnectorTypeId,
  serviceNowITSMTable,
  ServiceNowSIRConnectorTypeId,
  serviceNowSIRTable,
  ServiceNowITOMConnectorTypeId,
};

export type ActionParamsType =
  | TypeOf<typeof ExecutorParamsSchemaITSM>
  | TypeOf<typeof ExecutorParamsSchemaSIR>;

interface GetConnectorTypeParams {
  logger: Logger;
}

export type ServiceNowConnectorType<
  C extends Record<string, unknown> = ServiceNowPublicConfigurationBaseType,
  T extends Record<string, unknown> = ExecutorParams
> = ConnectorType<C, ServiceNowSecretConfigurationType, T, PushToServiceResponse | {}>;

export type ServiceNowConnectorTypeExecutorOptions<
  C extends Record<string, unknown> = ServiceNowPublicConfigurationBaseType,
  T extends Record<string, unknown> = ExecutorParams
> = ConnectorTypeExecutorOptions<C, ServiceNowSecretConfigurationType, T>;

// connector type definition
export function getServiceNowITSMConnectorType(
  params: GetConnectorTypeParams
): ServiceNowConnectorType<ServiceNowPublicConfigurationType, ExecutorParams> {
  const { logger } = params;
  return {
    id: ServiceNowITSMConnectorTypeId,
    minimumLicenseRequired: 'platinum',
    name: i18n.SERVICENOW_ITSM,
    supportedFeatureIds: [
      AlertingConnectorFeatureId,
      CasesConnectorFeatureId,
      UptimeConnectorFeatureId,
      SecurityConnectorFeatureId,
    ],
    validate: {
      config: {
        schema: ExternalIncidentServiceConfigurationSchema,
        customValidator: validate.config,
      },
      secrets: {
        schema: ExternalIncidentServiceSecretConfigurationSchema,
        customValidator: validate.secrets,
      },
      connector: validate.connector,
      params: {
        schema: ExecutorParamsSchemaITSM,
      },
    },
    executor: curry(executor)({
      logger,
      actionTypeId: ServiceNowITSMConnectorTypeId,
      createService: createExternalService,
      api: commonAPI,
    }),
  };
}

export function getServiceNowSIRConnectorType(
  params: GetConnectorTypeParams
): ServiceNowConnectorType<ServiceNowPublicConfigurationType, ExecutorParams> {
  const { logger } = params;
  return {
    id: ServiceNowSIRConnectorTypeId,
    minimumLicenseRequired: 'platinum',
    name: i18n.SERVICENOW_SIR,
    supportedFeatureIds: [
      AlertingConnectorFeatureId,
      CasesConnectorFeatureId,
      SecurityConnectorFeatureId,
    ],
    validate: {
      config: {
        schema: ExternalIncidentServiceConfigurationSchema,
        customValidator: validate.config,
      },
      secrets: {
        schema: ExternalIncidentServiceSecretConfigurationSchema,
        customValidator: validate.secrets,
      },
      connector: validate.connector,
      params: {
        schema: ExecutorParamsSchemaSIR,
      },
    },
    executor: curry(executor)({
      logger,
      actionTypeId: ServiceNowSIRConnectorTypeId,
      createService: createExternalServiceSIR,
      api: apiSIR,
    }),
  };
}

export function getServiceNowITOMConnectorType(
  params: GetConnectorTypeParams
): ServiceNowConnectorType<ServiceNowPublicConfigurationBaseType, ExecutorParamsITOM> {
  const { logger } = params;
  return {
    id: ServiceNowITOMConnectorTypeId,
    minimumLicenseRequired: 'platinum',
    name: i18n.SERVICENOW_ITOM,
    supportedFeatureIds: [AlertingConnectorFeatureId, SecurityConnectorFeatureId],
    validate: {
      config: {
        schema: ExternalIncidentServiceConfigurationBaseSchema,
        customValidator: validate.config,
      },
      secrets: {
        schema: ExternalIncidentServiceSecretConfigurationSchema,
        customValidator: validate.secrets,
      },
      connector: validate.connector,
      params: {
        schema: ExecutorParamsSchemaITOM,
      },
    },
    executor: curry(executorITOM)({
      logger,
      actionTypeId: ServiceNowITOMConnectorTypeId,
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
    actionTypeId,
    createService,
    api,
  }: {
    logger: Logger;
    actionTypeId: string;
    createService: ServiceFactory;
    api: ExternalServiceAPI;
  },
  execOptions: ServiceNowConnectorTypeExecutorOptions<
    ServiceNowPublicConfigurationType,
    ExecutorParams
  >
): Promise<ConnectorTypeExecutorResult<ServiceNowExecutorResultData | {}>> {
  const { actionId, config, params, secrets, services, configurationUtilities } = execOptions;
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
    actionTypeId,
    createService,
    api,
  }: {
    logger: Logger;
    actionTypeId: string;
    createService: ServiceFactory<ExternalServiceITOM>;
    api: ExternalServiceApiITOM;
  },
  execOptions: ServiceNowConnectorTypeExecutorOptions<
    ServiceNowPublicConfigurationBaseType,
    ExecutorParamsITOM
  >
): Promise<ConnectorTypeExecutorResult<ServiceNowExecutorResultData | {}>> {
  const { actionId, config, params, secrets, configurationUtilities } = execOptions;
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
