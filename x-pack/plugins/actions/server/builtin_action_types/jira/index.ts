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
  ExecutorSubActionCommonFieldsParams,
  ExecutorSubActionGetIssuesParams,
  ExecutorSubActionGetIssueParams,
  ExecutorSubActionGetIncidentParams,
} from './types';
import * as i18n from './translations';

export type ActionParamsType = TypeOf<typeof ExecutorParamsSchema>;
interface GetActionTypeParams {
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
}

const supportedSubActions: string[] = [
  'getFields',
  'getIncident',
  'pushToService',
  'issueTypes',
  'fieldsByIssueType',
  'issues',
  'issue',
];

export const ActionTypeId = '.jira';
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
    id: ActionTypeId,
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
    executor: curry(executor)({ logger, configurationUtilities }),
  };
}

// action executor
async function executor(
  {
    logger,
    configurationUtilities,
  }: { logger: Logger; configurationUtilities: ActionsConfigurationUtilities },
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

  if (subAction === 'getIncident') {
    const getIncidentParams = subActionParams as ExecutorSubActionGetIncidentParams;
    const res = await api.getIncident({
      externalService,
      params: getIncidentParams,
    });
    if (res != null) {
      data = res;
    }
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

  if (subAction === 'issueTypes') {
    const getIssueTypesParams = subActionParams as ExecutorSubActionCommonFieldsParams;
    data = await api.issueTypes({
      externalService,
      params: getIssueTypesParams,
    });
  }

  if (subAction === 'fieldsByIssueType') {
    const getFieldsByIssueTypeParams =
      subActionParams as ExecutorSubActionGetFieldsByIssueTypeParams;
    data = await api.fieldsByIssueType({
      externalService,
      params: getFieldsByIssueTypeParams,
    });
  }

  if (subAction === 'getFields') {
    data = await api.getFields({
      externalService,
      params: subActionParams,
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
