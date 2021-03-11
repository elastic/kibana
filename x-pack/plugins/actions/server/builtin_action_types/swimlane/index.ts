/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { curry } from 'lodash';
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { Logger } from '@kbn/logging';
import { ActionType, ActionTypeExecutorOptions, ActionTypeExecutorResult } from '../../types';
import { ActionsConfigurationUtilities } from '../../actions_config';
import {
  SwimlaneExecutorResultData,
  SwimlanePublicConfigurationType,
  SwimlaneSecretConfigurationType,
  ExecutorParams,
  ExecutorSubActionCreateRecordParams,
} from './types';
import { validate } from './validators';
import {
  ExecutorParamsSchema,
  SwimlaneSecretsConfiguration,
  SwimlaneServiceConfiguration,
} from './schema';
import { createExternalService } from './service';
import { api } from './api';

interface GetActionTypeParams {
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
}

const supportedSubActions: string[] = ['application', 'createRecord'];

// action type definition
export function getActionType(
  params: GetActionTypeParams
): ActionType<
  SwimlanePublicConfigurationType,
  SwimlaneSecretConfigurationType,
  ExecutorParams,
  SwimlaneExecutorResultData | {}
> {
  const { logger, configurationUtilities } = params;

  return {
    id: '.swimlane',
    minimumLicenseRequired: 'gold',
    name: i18n.translate('xpack.actions.builtin.swimlaneTitle', {
      defaultMessage: 'Swimlane',
    }),
    validate: {
      config: schema.object(SwimlaneServiceConfiguration, {
        validate: curry(validate.config)(configurationUtilities),
      }),
      secrets: schema.object(SwimlaneSecretsConfiguration, {
        validate: curry(validate.secrets)(configurationUtilities),
      }),
      params: ExecutorParamsSchema,
    },
    executor: curry(executor)({ logger }),
  };
}

async function executor(
  { logger }: { logger: Logger },
  execOptions: ActionTypeExecutorOptions<
    SwimlanePublicConfigurationType,
    SwimlaneSecretConfigurationType,
    ExecutorParams
  >
): Promise<ActionTypeExecutorResult<SwimlaneExecutorResultData | {}>> {
  const { actionId, config, params, secrets } = execOptions;
  const { subAction, subActionParams } = params as ExecutorParams;

  let data: SwimlaneExecutorResultData | null = null;

  const externalService = createExternalService(
    {
      config,
      secrets,
    },
    logger,
    execOptions.proxySettings
  );

  if (!api[subAction]) {
    const errorMessage = `[Action][ExternalService] -> [Swimlane] Unsupported subAction type ${subAction}.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  if (!supportedSubActions.includes(subAction)) {
    const errorMessage = `[Action][ExternalService] -> [Swimlane] subAction ${subAction} not implemented.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  if (subAction === 'createRecord') {
    const createRecordParams = subActionParams as ExecutorSubActionCreateRecordParams;

    data = await api.createRecord({
      externalService,
      params: createRecordParams,
      logger,
    });

    logger.debug(`Swimlane new record id ${data.id}`);
  }

  return { status: 'ok', data: data ?? {}, actionId };
}
