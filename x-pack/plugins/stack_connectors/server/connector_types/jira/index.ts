/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';

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
import { api } from './api';
import {
  ExecutorParamsSchema,
  ExternalIncidentServiceConfigurationSchema,
  ExternalIncidentServiceSecretConfigurationSchema,
} from './schema';
import { createExternalService } from './service';
import * as i18n from './translations';
import {
  ExecutorParams,
  ExecutorSubActionCommonFieldsParams,
  ExecutorSubActionGetFieldsByIssueTypeParams,
  ExecutorSubActionGetIncidentParams,
  ExecutorSubActionGetIssueParams,
  ExecutorSubActionGetIssuesParams,
  ExecutorSubActionPushParams,
  JiraExecutorResultData,
  JiraPublicConfigurationType,
  JiraSecretConfigurationType,
} from './types';
import { validate } from './validators';

export type ActionParamsType = TypeOf<typeof ExecutorParamsSchema>;

const supportedSubActions: string[] = [
  'getFields',
  'getIncident',
  'pushToService',
  'issueTypes',
  'fieldsByIssueType',
  'issues',
  'issue',
];

export const ConnectorTypeId = '.jira';
// connector type definition
export function getConnectorType(): ConnectorType<
  JiraPublicConfigurationType,
  JiraSecretConfigurationType,
  ExecutorParams,
  JiraExecutorResultData | {}
> {
  return {
    id: ConnectorTypeId,
    minimumLicenseRequired: 'gold',
    name: i18n.NAME,
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
    JiraPublicConfigurationType,
    JiraSecretConfigurationType,
    ExecutorParams
  >
): Promise<ConnectorTypeExecutorResult<JiraExecutorResultData | {}>> {
  const { actionId, config, params, secrets, configurationUtilities, logger } = execOptions;
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
