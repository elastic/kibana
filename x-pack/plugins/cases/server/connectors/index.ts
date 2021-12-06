/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RegisterConnectorsArgs,
  CommentSchemaType,
  ContextTypeGeneratedAlertType,
  ContextTypeAlertSchemaType,
} from './types';
import { getActionType as getCaseConnector } from './case';
import { CommentRequest, CommentType } from '../../common/api';

export * from './types';
export { transformConnectorComment } from './case';
export { casesConnectors } from './factory';

/**
 * Separator used for creating a json parsable array from the mustache syntax that the alerting framework
 * sends.
 */
export const separator = '__SEPARATOR__';

export const registerConnectors = ({
  registerActionType,
  logger,
  factory,
}: RegisterConnectorsArgs) => {
  registerActionType(
    getCaseConnector({
      logger,
      factory,
    })
  );
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
