/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCasesByAlertIdRoute } from './cases/alerts/get_cases';
import { deleteCaseRoute } from './cases/delete_cases';
import { findCaseRoute } from './cases/find_cases';
import { getCaseRoute, resolveCaseRoute } from './cases/get_case';
import { patchCaseRoute } from './cases/patch_cases';
import { postCaseRoute } from './cases/post_case';
import { pushCaseRoute } from './cases/push_case';
import { getReportersRoute } from './cases/reporters/get_reporters';
import { getStatusRoute } from './stats/get_status';
import { getUserActionsRoute } from './user_actions/get_all_user_actions';
import type { CaseRoute } from './types';
import { getTagsRoute } from './cases/tags/get_tags';
import { deleteAllCommentsRoute } from './comments/delete_all_comments';
import { deleteCommentRoute } from './comments/delete_comment';
import { findCommentsRoute } from './comments/find_comments';
import { getCommentRoute } from './comments/get_comment';
import { getAllCommentsRoute } from './comments/get_all_comment';
import { patchCommentRoute } from './comments/patch_comment';
import { postCommentRoute } from './comments/post_comment';
import { getCaseConfigureRoute } from './configure/get_configure';
import { getConnectorsRoute } from './configure/get_connectors';
import { patchCaseConfigureRoute } from './configure/patch_configure';
import { postCaseConfigureRoute } from './configure/post_configure';
import { getAllAlertsAttachedToCaseRoute } from './comments/get_alerts';
import { getCaseMetricRoute } from './metrics/get_case_metrics';
import { getCasesMetricRoute } from './metrics/get_cases_metrics';

export const getExternalRoutes = () =>
  [
    deleteCaseRoute,
    findCaseRoute,
    getCaseRoute,
    resolveCaseRoute,
    patchCaseRoute,
    postCaseRoute,
    pushCaseRoute,
    getUserActionsRoute,
    getStatusRoute,
    getCasesByAlertIdRoute,
    getReportersRoute,
    getTagsRoute,
    deleteCommentRoute,
    deleteAllCommentsRoute,
    findCommentsRoute,
    getCommentRoute,
    getAllCommentsRoute,
    patchCommentRoute,
    postCommentRoute,
    getCaseConfigureRoute,
    getConnectorsRoute,
    patchCaseConfigureRoute,
    postCaseConfigureRoute,
    getAllAlertsAttachedToCaseRoute,
    getCaseMetricRoute,
    getCasesMetricRoute,
  ] as CaseRoute[];
