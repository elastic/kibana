/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generatePath } from 'react-router-dom';

export const DEFAULT_BASE_PATH = '/cases';
export interface CaseViewPathParams {
  detailName: string;
  commentId?: string;
}

export const CASES_CREATE_PATH = '/create' as const;
export const CASES_CONFIGURE_PATH = '/configure' as const;
export const CASE_VIEW_PATH = '/:detailName' as const;
export const CASE_VIEW_COMMENT_PATH = `${CASE_VIEW_PATH}/:commentId` as const;

const normalizePath = (path: string): string => path.replaceAll('//', '/');

export const getCreateCasePath = (casesBasePath: string) =>
  normalizePath(`${casesBasePath}${CASES_CREATE_PATH}`);
export const getCasesConfigurePath = (casesBasePath: string) =>
  normalizePath(`${casesBasePath}${CASES_CONFIGURE_PATH}`);
export const getCaseViewPath = (casesBasePath: string) =>
  normalizePath(`${casesBasePath}${CASE_VIEW_PATH}`);
export const getCaseViewWithCommentPath = (casesBasePath: string) =>
  normalizePath(`${casesBasePath}${CASE_VIEW_COMMENT_PATH}`);

export const generateCaseViewPath = (params: CaseViewPathParams): string => {
  const { commentId } = params;
  // Cast for generatePath argument type constraint
  const pathParams = params as unknown as { [paramName: string]: string };

  if (commentId) {
    return normalizePath(generatePath(CASE_VIEW_COMMENT_PATH, pathParams));
  }
  return normalizePath(generatePath(CASE_VIEW_PATH, pathParams));
};
