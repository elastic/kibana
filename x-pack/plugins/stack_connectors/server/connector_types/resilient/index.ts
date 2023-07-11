/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';

import type {
  ActionType as ConnectorType,
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
} from '@kbn/actions-plugin/server/types';
import {
  AlertingConnectorFeatureId,
  CasesConnectorFeatureId,
  SecurityConnectorFeatureId,
} from '@kbn/actions-plugin/common/types';
import { validate } from './validators';
import {
  ExternalIncidentServiceConfigurationSchema,
  ExternalIncidentServiceSecretConfigurationSchema,
  ExecutorParamsSchema,
} from './schema';
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

export type ActionParamsType = TypeOf<typeof ExecutorParamsSchema>;

const supportedSubActions: string[] = ['getFields', 'pushToService', 'incidentTypes', 'severity'];

export const ConnectorTypeId = '.resilient';
// connector type definition
export function getConnectorType(): ConnectorType<
  ResilientPublicConfigurationType,
  ResilientSecretConfigurationType,
  ExecutorParams,
  ResilientExecutorResultData | {}
> {
  return {
    id: ConnectorTypeId,
    minimumLicenseRequired: 'platinum',
    name: i18n.NAME,
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
      params: {
        schema: ExecutorParamsSchema,
      },
    },
    executor,
  };
}

// action executor
async function executor(
  execOptions: ConnectorTypeExecutorOptions<
    ResilientPublicConfigurationType,
    ResilientSecretConfigurationType,
    ExecutorParams
  >
): Promise<ConnectorTypeExecutorResult<ResilientExecutorResultData | {}>> {
  const { actionId, config, params, secrets, configurationUtilities, logger } = execOptions;
  const { subAction, subActionParams } = params as ExecutorParams;
  let data: ResilientExecutorResultData | null = null;

  const externalService = createExternalService(
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
