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
  JiraPublicConfigurationType,
  JiraSecretConfigurationType,
  JiraExecutorResultData,
  ExecutorSubActionGetFieldsByIssueTypeParams,
  ExecutorSubActionGetIssueTypesParams,
  ExecutorSubActionGetIssuesParams,
  ExecutorSubActionGetIssueParams,
} from './types';
import * as i18n from './translations';
import { Logger } from '../../../../../../src/core/server';

// TODO: to remove, need to support Case
import { buildMap, mapParams } from '../case/utils';

interface GetActionTypeParams {
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
}

const supportedSubActions: string[] = [
  'pushToService',
  'issueTypes',
  'fieldsByIssueType',
  'issues',
  'issue',
];

// action type definition
export function getActionType(
  params: GetActionTypeParams
): ActionType<
  JiraPublicConfigurationType,
  JiraSecretConfigurationType,
  ExecutorParams,
  JiraExecutorResultData | {}
> {
  const { logger, configurationUtilities } = params;
  return {
    id: '.jira',
    minimumLicenseRequired: 'gold',
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
    JiraPublicConfigurationType,
    JiraSecretConfigurationType,
    ExecutorParams
  >
): Promise<ActionTypeExecutorResult<JiraExecutorResultData | {}>> {
  const { actionId, config, params, secrets } = execOptions;
  const { subAction, subActionParams } = params as ExecutorParams;
  let data: JiraExecutorResultData | null = null;

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
      config.incidentConfiguration && mapping
        ? mapParams<ExecutorSubActionPushParams>(restParams as ExecutorSubActionPushParams, mapping)
        : {};

    data = await api.pushToService({
      externalService,
      mapping,
      params: { ...pushToServiceParams, externalObject },
      logger,
    });

    logger.debug(`response push to service for incident id: ${data.id}`);
  }

  if (subAction === 'issueTypes') {
    const getIssueTypesParams = subActionParams as ExecutorSubActionGetIssueTypesParams;
    data = await api.issueTypes({
      externalService,
      params: getIssueTypesParams,
    });
  }

  if (subAction === 'fieldsByIssueType') {
    const getFieldsByIssueTypeParams = subActionParams as ExecutorSubActionGetFieldsByIssueTypeParams;
    data = await api.fieldsByIssueType({
      externalService,
      params: getFieldsByIssueTypeParams,
    });
  }

  if (subAction === 'issues') {
    const getIssuesParams = subActionParams as ExecutorSubActionGetIssuesParams;
    data = await api.issues({
      externalService,
      params: getIssuesParams,
    });
  }

  if (subAction === 'issue') {
    const getIssueParams = subActionParams as ExecutorSubActionGetIssueParams;
    data = await api.issue({
      externalService,
      params: getIssueParams,
    });
  }

  return { status: 'ok', data: data ?? {}, actionId };
}
