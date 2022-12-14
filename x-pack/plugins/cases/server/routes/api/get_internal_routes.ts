/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileService } from '../../services';
import { bulkCreateAttachmentsRoute } from './internal/bulk_create_attachments';
import { bulkGetCasesRoute } from './internal/bulk_get_cases';
import { suggestUserProfilesRoute } from './internal/suggest_user_profiles';
import type { CaseRoute } from './types';

export const getInternalRoutes = (userProfileService: UserProfileService) =>
  [
    bulkCreateAttachmentsRoute,
    suggestUserProfilesRoute(userProfileService),
    bulkGetCasesRoute,
  ] as CaseRoute[];
