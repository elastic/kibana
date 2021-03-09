/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { initDeleteCasesApi } from './cases/delete_cases';
import { initFindCasesApi } from '././cases/find_cases';
import { initGetCaseApi } from './cases/get_case';
import { initPatchCasesApi } from './cases/patch_cases';
import { initPostCaseApi } from './cases/post_case';
import { initPushCaseApi } from './cases/push_case';
import { initGetReportersApi } from './cases/reporters/get_reporters';
import { initGetCasesStatusApi } from './cases/status/get_status';
import { initGetTagsApi } from './cases/tags/get_tags';
import {
  initGetAllCaseUserActionsApi,
  initGetAllSubCaseUserActionsApi,
} from './cases/user_actions/get_all_user_actions';

import { initDeleteCommentApi } from './cases/comments/delete_comment';
import { initDeleteAllCommentsApi } from './cases/comments/delete_all_comments';
import { initFindCaseCommentsApi } from './cases/comments/find_comments';
import { initGetAllCommentsApi } from './cases/comments/get_all_comment';
import { initGetCommentApi } from './cases/comments/get_comment';
import { initPatchCommentApi } from './cases/comments/patch_comment';
import { initPostCommentApi } from './cases/comments/post_comment';

import { initCaseConfigureGetActionConnector } from './cases/configure/get_connectors';
import { initGetCaseConfigure } from './cases/configure/get_configure';
import { initPatchCaseConfigure } from './cases/configure/patch_configure';
import { initPostCaseConfigure } from './cases/configure/post_configure';

import { RouteDeps } from './types';
import { initGetSubCaseApi } from './cases/sub_case/get_sub_case';
import { initPatchSubCasesApi } from './cases/sub_case/patch_sub_cases';
import { initFindSubCasesApi } from './cases/sub_case/find_sub_cases';
import { initDeleteSubCasesApi } from './cases/sub_case/delete_sub_cases';

/**
 * Default page number when interacting with the saved objects API.
 */
export const defaultPage = 1;
/**
 * Default number of results when interacting with the saved objects API.
 */
export const defaultPerPage = 20;

export function initCaseApi(deps: RouteDeps) {
  // Cases
  initDeleteCasesApi(deps);
  initFindCasesApi(deps);
  initGetCaseApi(deps);
  initPatchCasesApi(deps);
  initPostCaseApi(deps);
  initPushCaseApi(deps);
  initGetAllCaseUserActionsApi(deps);
  initGetAllSubCaseUserActionsApi(deps);
  // Sub cases
  initGetSubCaseApi(deps);
  initPatchSubCasesApi(deps);
  initFindSubCasesApi(deps);
  initDeleteSubCasesApi(deps);
  // Comments
  initDeleteCommentApi(deps);
  initDeleteAllCommentsApi(deps);
  initFindCaseCommentsApi(deps);
  initGetCommentApi(deps);
  initGetAllCommentsApi(deps);
  initPatchCommentApi(deps);
  initPostCommentApi(deps);
  // Cases Configure
  initCaseConfigureGetActionConnector(deps);
  initGetCaseConfigure(deps);
  initPatchCaseConfigure(deps);
  initPostCaseConfigure(deps);
  // Reporters
  initGetReportersApi(deps);
  // Status
  initGetCasesStatusApi(deps);
  // Tags
  initGetTagsApi(deps);
}
