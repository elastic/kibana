/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generatePath } from 'react-router-dom';

export interface CasesViewPathParams {
  detailName: string;
  subCaseId?: string;
  commentId?: string;
}

export const CASES_CREATE_PATH = '/create' as const;
export const CASES_CONFIGURE_PATH = '/configure' as const;
export const CASES_DETAIL_PATH = '/:detailName' as const;
export const CASES_SUB_CASE_DETAIL_PATH = `${CASES_DETAIL_PATH}/sub-cases/:subCaseId` as const;
export const CASES_DETAIL_COMMENT_PATH = `${CASES_DETAIL_PATH}/:commentId` as const;
export const CASES_SUB_CASE_DETAIL_COMMENT_PATH =
  `${CASES_SUB_CASE_DETAIL_PATH}/:commentId` as const;

export const getCasesCreatePath = (casesPath: string) => `${casesPath}${CASES_CREATE_PATH}`;
export const getCasesConfigurePath = (casesPath: string) => `${casesPath}${CASES_CONFIGURE_PATH}`;
export const getCasesDetailPath = (casesPath: string) => `${casesPath}${CASES_DETAIL_PATH}`;
export const getCasesSubCaseDetailPath = (casesPath: string) =>
  `${casesPath}${CASES_SUB_CASE_DETAIL_PATH}`;
export const getCasesDetailWithCommentPath = (casesPath: string) =>
  `${casesPath}${CASES_DETAIL_COMMENT_PATH}`;
export const getCasesSubCaseDetailWithCommentPath = (casesPath: string) =>
  `${casesPath}${CASES_SUB_CASE_DETAIL_COMMENT_PATH}`;

export const generateCasesDetailPath = (params: CasesViewPathParams): string => {
  const { subCaseId, commentId } = params;
  // Cast for generatePath argument type constraint
  const pathParams = params as unknown as { [paramName: string]: string };
  if (subCaseId && commentId) {
    return generatePath(CASES_SUB_CASE_DETAIL_COMMENT_PATH, pathParams);
  }
  if (subCaseId) {
    return generatePath(CASES_SUB_CASE_DETAIL_PATH, pathParams);
  }
  if (commentId) {
    return generatePath(CASES_DETAIL_COMMENT_PATH, pathParams);
  }
  return generatePath(CASES_DETAIL_PATH, pathParams);
};
