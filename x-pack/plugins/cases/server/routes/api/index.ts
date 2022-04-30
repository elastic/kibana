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
import { initGetCasesStatusApi } from './stats/get_status';
import { initGetTagsApi } from './cases/tags/get_tags';
import {
  initGetAllCaseUserActionsApi,
  initGetAllSubCaseUserActionsApi,
} from './user_actions/get_all_user_actions';

import { initDeleteCommentApi } from './comments/delete_comment';
import { initDeleteAllCommentsApi } from './comments/delete_all_comments';
import { initFindCaseCommentsApi } from './comments/find_comments';
import { initGetAllCommentsApi } from './comments/get_all_comment';
import { initGetCommentApi } from './comments/get_comment';
import { initPatchCommentApi } from './comments/patch_comment';
import { initPostCommentApi } from './comments/post_comment';

import { initCaseConfigureGetActionConnector } from './configure/get_connectors';
import { initGetCaseConfigure } from './configure/get_configure';
import { initPatchCaseConfigure } from './configure/patch_configure';
import { initPostCaseConfigure } from './configure/post_configure';

import { RouteDeps } from './types';
import { initGetSubCaseApi } from './sub_case/get_sub_case';
import { initPatchSubCasesApi } from './sub_case/patch_sub_cases';
import { initFindSubCasesApi } from './sub_case/find_sub_cases';
import { initDeleteSubCasesApi } from './sub_case/delete_sub_cases';
import { ENABLE_CASE_CONNECTOR } from '../../../common/constants';
import { initGetCasesByAlertIdApi } from './cases/alerts/get_cases';
import { initGetAllAlertsAttachToCaseApi } from './comments/get_alerts';

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

  if (ENABLE_CASE_CONNECTOR) {
    // Sub cases
    initGetAllSubCaseUserActionsApi(deps);
    initGetSubCaseApi(deps);
    initPatchSubCasesApi(deps);
    initFindSubCasesApi(deps);
    initDeleteSubCasesApi(deps);
  }

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
  // Alerts
  initGetCasesByAlertIdApi(deps);
  initGetAllAlertsAttachToCaseApi(deps);
}
