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
  UptimeConnectorFeatureId,
  SecurityConnectorFeatureId,
} from '@kbn/actions-plugin/common/types';
import { validate } from './validators';
import { SlackConfigSchema, SlackSecretsSchema } from './schema';
import { ExecutorParamsSchema } from '../../../common/slack/schema';
import { createExternalService } from './service';
import { api } from './api';
import {
  SlackExecutorResultData,
  ExecutorSubActionPostMessageParams,
  ExecutorSubActionGetChannelsParams,
} from './types';
import { SlackConfig, SlackSecrets, SlackExecuteActionParams } from '../../../common/slack/types';
import { SLACK_CONNECTOR_ID } from '../../../common/slack/constants';
import { SLACK_CONNECTOR_NAME } from './translations';

export type ActionParamsType = TypeOf<typeof ExecutorParamsSchema>;

const supportedSubActions = ['getChannels', 'postMessage'];

export const getConnectorType = (): ConnectorType<
  SlackConfig,
  SlackSecrets,
  SlackExecuteActionParams,
  SlackExecutorResultData | {}
> => {
  return {
    id: SLACK_CONNECTOR_ID,
    name: SLACK_CONNECTOR_NAME,
    minimumLicenseRequired: 'gold', // think about which lisence it should belong
    supportedFeatureIds: [
      AlertingConnectorFeatureId,
      UptimeConnectorFeatureId,
      SecurityConnectorFeatureId,
    ],
    validate: {
      config: {
        schema: SlackConfigSchema,
        customValidator: validate.config,
      },
      secrets: {
        schema: SlackSecretsSchema,
        customValidator: validate.secrets,
      },
      params: {
        schema: ExecutorParamsSchema,
      },
    },
    executor,
  };
};

const executor = async (
  execOptions: ConnectorTypeExecutorOptions<SlackConfig, SlackSecrets, SlackExecuteActionParams>
): Promise<ConnectorTypeExecutorResult<SlackExecutorResultData | {}>> => {
  const { actionId, params, secrets, configurationUtilities, logger } = execOptions;
  const { subAction, subActionParams } = params;
  let data: SlackExecutorResultData | null = null;

  const externalService = createExternalService(
    {
      config: {},
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

  if (subAction === 'getChannels') {
    data = await api.getChannels({
      externalService,
    });
  }

  if (subAction === 'postMessage') {
    const postMessageParams = subActionParams as ExecutorSubActionPostMessageParams;
    data = await api.postMessage({
      externalService,
      params: postMessageParams,
    });

    // complete text
    logger.debug(`response push to service for incident id: `);
  }

  return { status: 'ok', data: data ?? {}, actionId };
};
