/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CASE_DETAILS_URL,
  CASE_COMMENTS_URL,
  CASE_USER_ACTIONS_URL,
  CASE_COMMENT_DETAILS_URL,
} from '../constants';

export const getCaseDetailsUrl = (id: string): string => {
  return CASE_DETAILS_URL.replace('{case_id}', id);
};

export const getCaseCommentsUrl = (id: string): string => {
  return CASE_COMMENTS_URL.replace('{case_id}', id);
};

export const getCaseCommentDetailsUrl = (caseId: string, commentId: string): string => {
  return CASE_COMMENT_DETAILS_URL.replace('{case_id}', caseId).replace('{comment_id}', commentId);
};

export const getCaseUserActionUrl = (id: string): string => {
  return CASE_USER_ACTIONS_URL.replace('{case_id}', id);
};
