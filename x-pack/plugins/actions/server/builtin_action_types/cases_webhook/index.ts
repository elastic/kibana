/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { curry } from 'lodash';
import { Logger } from '@kbn/core/server';
import { CasesConnectorFeatureId } from '../../../common';
import {
  CasesWebhookActionParamsType,
  CasesWebhookExecutorResultData,
  CasesWebhookPublicConfigurationType,
  CasesWebhookSecretConfigurationType,
  ExecutorParams,
  ExecutorSubActionPushParams,
} from './types';
import { ActionType, ActionTypeExecutorOptions, ActionTypeExecutorResult } from '../../types';
import { ActionsConfigurationUtilities } from '../../actions_config';
import { createExternalService } from './service';
import {
  ExecutorParamsSchema,
  ExternalIncidentServiceConfigurationSchema,
  ExternalIncidentServiceSecretConfigurationSchema,
} from './schema';
import { api } from './api';
import { validate } from './validators';
import * as i18n from './translations';

const supportedSubActions: string[] = ['pushToService'];
export type ActionParamsType = CasesWebhookActionParamsType;
export const ActionTypeId = '.cases-webhook';
// action type definition
export function getActionType({
  logger,
  configurationUtilities,
}: {
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
}): ActionType<
  CasesWebhookPublicConfigurationType,
  CasesWebhookSecretConfigurationType,
  ExecutorParams,
  CasesWebhookExecutorResultData
> {
  return {
    id: ActionTypeId,
    minimumLicenseRequired: 'gold',
    name: i18n.NAME,
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
      connector: validate.connector,
    },
    executor: curry(executor)({ logger, configurationUtilities }),
    supportedFeatureIds: [CasesConnectorFeatureId],
  };
}

// action executor
export async function executor(
  {
    logger,
    configurationUtilities,
  }: { logger: Logger; configurationUtilities: ActionsConfigurationUtilities },
  execOptions: ActionTypeExecutorOptions<
    CasesWebhookPublicConfigurationType,
    CasesWebhookSecretConfigurationType,
    CasesWebhookActionParamsType
  >
): Promise<ActionTypeExecutorResult<CasesWebhookExecutorResultData>> {
  const actionId = execOptions.actionId;
  const { subAction, subActionParams } = execOptions.params;
  let data: CasesWebhookExecutorResultData | undefined;

  const externalService = createExternalService(
    actionId,
    {
      config: execOptions.config,
      secrets: execOptions.secrets,
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

    logger.debug(`response push to service for case id: ${data.id}`);
  }

  return { status: 'ok', data, actionId };
}
