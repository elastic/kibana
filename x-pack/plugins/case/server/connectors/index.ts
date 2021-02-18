/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RegisterConnectorsArgs,
  ExternalServiceFormatterMapper,
  CommentSchemaType,
  ContextTypeGeneratedAlertType,
  ContextTypeAlertSchemaType,
} from './types';
import { getActionType as getCaseConnector } from './case';
import { serviceNowITSMExternalServiceFormatter } from './servicenow/itsm_formatter';
import { serviceNowSIRExternalServiceFormatter } from './servicenow/sir_formatter';
import { jiraExternalServiceFormatter } from './jira/external_service_formatter';
import { resilientExternalServiceFormatter } from './resilient/external_service_formatter';
import { CommentRequest, CommentType } from '../../common/api';

export * from './types';
export { transformConnectorComment } from './case';

export const registerConnectors = ({
  actionsRegisterType,
  logger,
  caseService,
  caseConfigureService,
  connectorMappingsService,
  userActionService,
  alertsService,
}: RegisterConnectorsArgs) => {
  actionsRegisterType(
    getCaseConnector({
      logger,
      caseService,
      caseConfigureService,
      connectorMappingsService,
      userActionService,
      alertsService,
    })
  );
};

export const externalServiceFormatters: ExternalServiceFormatterMapper = {
  '.servicenow': serviceNowITSMExternalServiceFormatter,
  '.servicenow-sir': serviceNowSIRExternalServiceFormatter,
  '.jira': jiraExternalServiceFormatter,
  '.resilient': resilientExternalServiceFormatter,
};

export const isCommentGeneratedAlert = (
  comment: CommentSchemaType | CommentRequest
): comment is ContextTypeGeneratedAlertType => {
  return (
    comment.type === CommentType.generatedAlert &&
    'alerts' in comment &&
    comment.alerts !== undefined
  );
};

export const isCommentAlert = (
  comment: CommentSchemaType
): comment is ContextTypeAlertSchemaType => {
  return comment.type === CommentType.alert;
};

/**
 * Separator field for the case connector alerts string parser.
 */
const separator = '__SEPARATOR__';

interface AlertIDIndex {
  _id: string;
  _index: string;
  ruleId: string;
  ruleName: string;
}

/**
 * Creates the format that the connector's parser is expecting, it should result in something like this:
 * [{"_id":"1","_index":"index1"}__SEPARATOR__{"_id":"id2","_index":"index2"}__SEPARATOR__]
 *
 * This should only be used for testing purposes.
 */
export function createAlertsString(alerts: AlertIDIndex[]) {
  return `[${alerts.reduce((acc, alert) => {
    return `${acc}${JSON.stringify(alert)}${separator}`;
  }, '')}]`;
}
