/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileService } from '../../services';
import { getCategoriesRoute } from './cases/categories/get_categories';
import { bulkCreateAttachmentsRoute } from './internal/bulk_create_attachments';
import { bulkDeleteFileAttachments } from './internal/bulk_delete_file_attachments';
import { bulkGetAttachmentsRoute } from './internal/bulk_get_attachments';
import { bulkGetCasesRoute } from './internal/bulk_get_cases';
import { getCaseMetricRoute } from './internal/get_case_metrics';
import { getCaseUserActionStatsRoute } from './internal/get_case_user_actions_stats';
import { getCaseUsersRoute } from './internal/get_case_users';
import { getCasesMetricRoute } from './internal/get_cases_metrics';
import { getConnectorsRoute } from './internal/get_connectors';
import { replaceCustomFieldRoute } from './internal/replace_custom_field';
import { searchCasesRoute } from './internal/search_cases';
import { suggestUserProfilesRoute } from './internal/suggest_user_profiles';
import type { CaseRoute } from './types';

export const getInternalRoutes = (userProfileService: UserProfileService) =>
  [
    bulkCreateAttachmentsRoute,
    suggestUserProfilesRoute(userProfileService),
    getConnectorsRoute,
    bulkGetCasesRoute,
    getCaseUserActionStatsRoute,
    bulkGetAttachmentsRoute,
    getCaseUsersRoute,
    bulkDeleteFileAttachments,
    getCategoriesRoute,
    getCaseMetricRoute,
    getCasesMetricRoute,
    searchCasesRoute,
    replaceCustomFieldRoute,
  ] as CaseRoute[];
