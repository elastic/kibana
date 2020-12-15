/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { initDeleteCasesApi } from './cases/delete_cases';
import { initFindCasesApi } from '././cases/find_cases';
import { initGetCaseApi } from './cases/get_case';
import { initPatchCasesApi } from './cases/patch_cases';
import { initPostCaseApi } from './cases/post_case';
import { initPushCaseUserActionApi } from './cases/push_case';
import { initGetReportersApi } from './cases/reporters/get_reporters';
import { initGetCasesStatusApi } from './cases/status/get_status';
import { initGetTagsApi } from './cases/tags/get_tags';
import { initGetAllUserActionsApi } from './cases/user_actions/get_all_user_actions';

import { initDeleteCommentApi } from './cases/comments/delete_comment';
import { initDeleteAllCommentsApi } from './cases/comments/delete_all_comments';
import { initFindCaseCommentsApi } from './cases/comments/find_comments';
import { initGetAllCommentsApi } from './cases/comments/get_all_comment';
import { initGetCommentApi } from './cases/comments/get_comment';
import { initPatchCommentApi } from './cases/comments/patch_comment';
import { initPostCommentApi } from './cases/comments/post_comment';

import { initCaseConfigureGetActionConnector } from './cases/configure/get_connectors';
import { initGetCaseConfigure } from './cases/configure/get_configure';
import { initCaseConfigureGetFields } from './cases/configure/get_fields';
import { initPatchCaseConfigure } from './cases/configure/patch_configure';
import { initPostCaseConfigure } from './cases/configure/post_configure';
import { initPostPushToService } from './cases/configure/post_push_to_service';

import { RouteDeps } from './types';

export function initCaseApi(deps: RouteDeps) {
  // Cases
  initDeleteCasesApi(deps);
  initFindCasesApi(deps);
  initGetCaseApi(deps);
  initPatchCasesApi(deps);
  initPostCaseApi(deps);
  initPushCaseUserActionApi(deps);
  initGetAllUserActionsApi(deps);
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
  initCaseConfigureGetFields(deps);
  initPostPushToService(deps);
  // Reporters
  initGetReportersApi(deps);
  // Status
  initGetCasesStatusApi(deps);
  // Tags
  initGetTagsApi(deps);
}
