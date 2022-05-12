/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CASE_DETAILS_URL,
  CASE_METRICS_DETAILS_URL,
  CASE_COMMENTS_URL,
  CASE_USER_ACTIONS_URL,
  CASE_COMMENT_DETAILS_URL,
  CASE_PUSH_URL,
  CASE_CONFIGURE_DETAILS_URL,
  CASE_ALERTS_URL,
  CASE_COMMENT_DELETE_URL,
} from '../constants';

export const getCaseDetailsUrl = (id: string): string => {
  return CASE_DETAILS_URL.replace('{case_id}', id);
};

export const getCaseDetailsMetricsUrl = (id: string): string => {
  return CASE_METRICS_DETAILS_URL.replace('{case_id}', id);
};

export const getCaseCommentsUrl = (id: string): string => {
  return CASE_COMMENTS_URL.replace('{case_id}', id);
};

export const getCaseCommentDetailsUrl = (caseId: string, commentId: string): string => {
  return CASE_COMMENT_DETAILS_URL.replace('{case_id}', caseId).replace('{comment_id}', commentId);
};

export const getCaseCommentDeleteUrl = (caseId: string, commentId: string): string => {
  return CASE_COMMENT_DELETE_URL.replace('{case_id}', caseId).replace('{comment_id}', commentId);
};

export const getCaseUserActionUrl = (id: string): string => {
  return CASE_USER_ACTIONS_URL.replace('{case_id}', id);
};

export const getCasePushUrl = (caseId: string, connectorId: string): string => {
  return CASE_PUSH_URL.replace('{case_id}', caseId).replace('{connector_id}', connectorId);
};

export const getCaseConfigurationDetailsUrl = (configureID: string): string => {
  return CASE_CONFIGURE_DETAILS_URL.replace('{configuration_id}', configureID);
};

export const getCasesFromAlertsUrl = (alertId: string): string => {
  return CASE_ALERTS_URL.replace('{alert_id}', alertId);
};
