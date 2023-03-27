/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileService } from '../../services';
import { getConnectorsRoute } from './internal/get_connectors';
import { getCaseUserActionStatsRoute } from './internal/get_case_user_actions_stats';
import { bulkCreateAttachmentsRoute } from './internal/bulk_create_attachments';
import { bulkGetCasesRoute } from './internal/bulk_get_cases';
import { suggestUserProfilesRoute } from './internal/suggest_user_profiles';
import type { CaseRoute } from './types';
import { bulkGetAttachmentsRoute } from './internal/bulk_get_attachments';
import { getCaseUsersRoute } from './internal/get_case_users';

export const getInternalRoutes = (userProfileService: UserProfileService) =>
  [
    bulkCreateAttachmentsRoute,
    suggestUserProfilesRoute(userProfileService),
    getConnectorsRoute,
    bulkGetCasesRoute,
    getCaseUserActionStatsRoute,
    bulkGetAttachmentsRoute,
    getCaseUsersRoute,
  ] as CaseRoute[];
