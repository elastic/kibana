/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';

export const ALERT_HISTORY_PREFIX = 'alert-history-';
export const AlertHistoryEsIndexConnectorIndexName = `${ALERT_HISTORY_PREFIX}index`;
export const AlertHistoryDefaultIndexName = `${ALERT_HISTORY_PREFIX}default`;
export const AlertHistoryEsIndexConnectorId = 'preconfigured-alert-history-es-index';

export const buildAlertHistoryDocument = (variables: Record<string, unknown>) => {
  const {
    date,
    alert: alertVariables,
    context,
    params,
    state,
    tags,
    rule: ruleVariables,
  } = variables as {
    date: string;
    alert: Record<string, unknown>;
    context: Record<string, unknown>;
    params: Record<string, unknown>;
    state: Record<string, unknown>;
    rule: Record<string, unknown>;
    tags: string[];
  };

  if (!alertVariables || !ruleVariables) {
    return null;
  }

  const { actionGroup, actionGroupName, id: alertId } = alertVariables as {
    actionGroup: string;
    actionGroupName: string;
    id: string;
  };

  const { id: ruleId, name, spaceId, type } = ruleVariables as {
    id: string;
    name: string;
    spaceId: string;
    type: string;
  };

  if (!type) {
    // can't build the document without a type
    return null;
  }

  const ruleType = type.replace('.', '__');

  const rule = {
    ...(ruleId ? { id: ruleId } : {}),
    ...(name ? { name } : {}),
    ...(!isEmpty(params) ? { params: { [ruleType]: params } } : {}),
    ...(spaceId ? { space: spaceId } : {}),
    ...(type ? { type } : {}),
  };
  const alert = {
    ...(alertId ? { id: alertId } : {}),
    ...(!isEmpty(state) ? { state: { [ruleType]: state } } : {}),
    ...(!isEmpty(context) ? { context: { [ruleType]: context } } : {}),
    ...(actionGroup ? { actionGroup } : {}),
    ...(actionGroupName ? { actionGroupName } : {}),
  };

  const alertHistoryDoc = {
    '@timestamp': date ? date : new Date().toISOString(),
    ...(tags && tags.length > 0 ? { tags } : {}),
    ...(context?.message ? { message: context.message } : {}),
    ...(!isEmpty(rule) ? { rule } : {}),
    ...(!isEmpty(alert) ? { alert } : {}),
  };

  return !isEmpty(alertHistoryDoc) ? { ...alertHistoryDoc, event: { kind: 'alert' } } : null;
};

export const AlertHistoryDocumentSchema = Object.freeze(
  buildAlertHistoryDocument({
    rule: {
      id: '{{rule.id}}',
      name: '{{rule.name}}',
      type: '{{rule.type}}',
      spaceId: '{{rule.spaceId}}',
    },
    context: '{{context}}',
    state: '{{state}}',
    params: '{{params}}',
    tags: '{{rule.tags}}',
    alert: {
      id: '{{alert.id}}',
      actionGroup: '{{alert.actionGroup}}',
      actionGroupName: '{{alert.actionGroupName}}',
    },
  })
);
