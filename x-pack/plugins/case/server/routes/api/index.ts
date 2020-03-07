/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { initDeleteCasesApi } from './cases/delete_cases';
import { initGetAllCasesApi } from './cases/get_all_cases';
import { initGetCaseApi } from './cases/get_case';
import { initPatchCaseApi } from './cases/patch_case';
import { initPostCaseApi } from './cases/post_case';

import { initDeleteCommentApi } from './cases/comments/delete_comment';
import { initDeleteAllCommentsApi } from './cases/comments/delete_all_comments';
import { initFindCaseCommentsApi } from './cases/comments/find_comments';
import { initGetAllCommentsApi } from './cases/comments/get_all_comment';
import { initGetCommentApi } from './cases/comments/get_comment';
import { initPatchCommentApi } from './cases/comments/patch_comment';
import { initPostCommentApi } from './cases/comments/post_comment';

import { initCaseConfigurePutActionConnector } from './cases/configure/get_connectors';
import { initCaseConfigurePatchActionConnector } from './cases/configure/patch_connector';
import { initGetCaseConfigure } from './cases/configure/get_configure';
import { initPatchCaseConfigure } from './cases/configure/patch_configure';
import { initPostCaseConfigure } from './cases/configure/post_configure';

import { initGetTagsApi } from './cases/tags/get_tags';

import { RouteDeps } from './types';

export function initCaseApi(deps: RouteDeps) {
  // Cases
  initDeleteCasesApi(deps);
  initFindCaseCommentsApi(deps);
  initGetAllCasesApi(deps);
  initGetCaseApi(deps);
  initPostCaseApi(deps);
  initPatchCaseApi(deps);
  // Cases Comments
  initDeleteCommentApi(deps);
  initDeleteAllCommentsApi(deps);
  initGetCommentApi(deps);
  initGetAllCommentsApi(deps);
  initPostCommentApi(deps);
  initPatchCommentApi(deps);
  // Cases Configure
  initCaseConfigurePutActionConnector(deps);
  initCaseConfigurePatchActionConnector(deps);
  initGetCaseConfigure(deps);
  initPatchCaseConfigure(deps);
  initPostCaseConfigure(deps);
  // Cases Tags
  initGetTagsApi(deps);
}
