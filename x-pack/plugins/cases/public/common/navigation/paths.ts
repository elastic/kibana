/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/module_migration
import type { ExtractRouteParams } from 'react-router';
import { generatePath } from 'react-router-dom';
import {
  CASES_CREATE_PATH,
  CASES_CONFIGURE_PATH,
  CASE_VIEW_PATH,
  CASE_VIEW_COMMENT_PATH,
  CASE_VIEW_TAB_PATH,
} from '../../../common/constants';
import type { CASE_VIEW_PAGE_TABS } from '../../../common/types';

export const DEFAULT_BASE_PATH = '/cases';

export interface CaseViewPathSearchParams {
  tabId?: CASE_VIEW_PAGE_TABS;
}

export type CaseViewPathParams = {
  detailName: string;
  commentId?: string;
} & CaseViewPathSearchParams;

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
  const { commentId, tabId } = params;
  // paths with commentId have their own specific path.
  // Effectively overwrites the tabId
  if (commentId) {
    return normalizePath(
      generatePath(
        CASE_VIEW_COMMENT_PATH,
        params as ExtractRouteParams<typeof CASE_VIEW_COMMENT_PATH>
      )
    );
  }

  if (tabId !== undefined) {
    return normalizePath(
      generatePath(CASE_VIEW_TAB_PATH, params as ExtractRouteParams<typeof CASE_VIEW_TAB_PATH>)
    );
  }

  return normalizePath(
    generatePath(CASE_VIEW_PATH, params as ExtractRouteParams<typeof CASE_VIEW_PATH>)
  );
};
