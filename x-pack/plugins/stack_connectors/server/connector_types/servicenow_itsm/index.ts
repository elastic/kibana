/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { curry } from 'lodash';

import {
  AlertingConnectorFeatureId,
  CasesConnectorFeatureId,
  SecurityConnectorFeatureId,
  UptimeConnectorFeatureId,
} from '@kbn/actions-plugin/common/types';
import type {
  ActionType as ConnectorType,
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
} from '@kbn/actions-plugin/server/types';
import {
  ServiceNowITSMConnectorTypeId,
  serviceNowITSMTable,
  snExternalServiceConfig,
} from '../lib/servicenow/config';
import { createServiceWrapper } from '../lib/servicenow/create_service_wrapper';
import {
  ExecutorParamsSchemaITSM,
  ExternalIncidentServiceConfigurationSchema,
  ExternalIncidentServiceSecretConfigurationSchema,
} from '../lib/servicenow/schema';
import * as i18n from '../lib/servicenow/translations';
import {
  ExecutorParams,
  ExecutorSubActionCloseIncidentParams,
  ExecutorSubActionCommonFieldsParams,
  ExecutorSubActionGetChoicesParams,
  ExecutorSubActionPushParams,
  ExternalService,
  ExternalServiceAPI,
  PushToServiceResponse,
  ServiceFactory,
  ServiceNowExecutorResultData,
  ServiceNowPublicConfigurationBaseType,
  ServiceNowPublicConfigurationType,
  ServiceNowSecretConfigurationType,
} from '../lib/servicenow/types';
import { throwIfSubActionIsNotSupported } from '../lib/servicenow/utils';
import { validate } from '../lib/servicenow/validators';
import { api as apiITSM } from './api';
import { createExternalService } from './service';

export { ServiceNowITSMConnectorTypeId, serviceNowITSMTable };

export type ActionParamsType = TypeOf<typeof ExecutorParamsSchemaITSM>;

export type ServiceNowConnectorType<
  C extends Record<string, unknown> = ServiceNowPublicConfigurationBaseType,
  T extends Record<string, unknown> = ExecutorParams,
> = ConnectorType<C, ServiceNowSecretConfigurationType, T, PushToServiceResponse | {}>;

export type ServiceNowConnectorTypeExecutorOptions<
  C extends Record<string, unknown> = ServiceNowPublicConfigurationBaseType,
  T extends Record<string, unknown> = ExecutorParams,
> = ConnectorTypeExecutorOptions<C, ServiceNowSecretConfigurationType, T>;

// connector type definition
export function getServiceNowITSMConnectorType(): ServiceNowConnectorType<
  ServiceNowPublicConfigurationType,
  ExecutorParams
> {
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
      actionTypeId: ServiceNowITSMConnectorTypeId,
      createService: createExternalService,
      api: apiITSM,
    }),
  };
}

// action executor
const supportedSubActions: string[] = [
  'getFields',
  'pushToService',
  'getChoices',
  'getIncident',
  'closeIncident',
];
async function executor(
  {
    actionTypeId,
    createService,
    api,
  }: {
    actionTypeId: string;
    createService: ServiceFactory;
    api: ExternalServiceAPI;
  },
  execOptions: ServiceNowConnectorTypeExecutorOptions<
    ServiceNowPublicConfigurationType,
    ExecutorParams
  >
): Promise<ConnectorTypeExecutorResult<ServiceNowExecutorResultData | {}>> {
  const { actionId, config, params, secrets, services, configurationUtilities, logger } =
    execOptions;
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

  if (subAction === 'closeIncident') {
    const closeIncidentParams = subActionParams as ExecutorSubActionCloseIncidentParams;
    data = await api.closeIncident({
      externalService,
      params: closeIncidentParams,
      logger,
    });
  }

  return { status: 'ok', data: data ?? {}, actionId };
}
