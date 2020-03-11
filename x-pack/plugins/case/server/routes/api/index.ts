/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { initDeleteCasesApi } from './cases/delete_cases';
import { initFindCasesApi } from '././cases/find_cases';
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

import { initGetTagsApi } from './cases/tags/get_tags';

import { initGetCasesStatusApi } from './cases/status/get_status';

import { RouteDeps } from './types';

export function initCaseApi(deps: RouteDeps) {
  // Cases
  initDeleteCasesApi(deps);
  initFindCasesApi(deps);
  initGetCaseApi(deps);
  initPatchCaseApi(deps);
  initPostCaseApi(deps);
  // Comments
  initDeleteCommentApi(deps);
  initDeleteAllCommentsApi(deps);
  initFindCaseCommentsApi(deps);
  initGetCaseApi(deps);
  initGetCommentApi(deps);
  initGetAllCommentsApi(deps);
  initPatchCommentApi(deps);
  initPostCommentApi(deps);
  // Tags
  initGetTagsApi(deps);
  // Status
  initGetCasesStatusApi(deps);
}
