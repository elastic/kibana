/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileService } from '../../../services';
import { INTERNAL_SUGGEST_USER_PROFILES_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { escapeHatch } from '../utils';

export const suggestUserProfilesRoute = (userProfileService: UserProfileService) =>
  createCasesRoute({
    method: 'post',
    path: INTERNAL_SUGGEST_USER_PROFILES_URL,
    routerOptions: {
      tags: ['access:casesSuggestUserProfiles'],
    },
    params: {
      body: escapeHatch,
    },
    handler: async ({ request, response }) => {
      try {
        return response.ok({
          body: await userProfileService.suggest(request),
        });
      } catch (error) {
        throw createCaseError({
          message: `Failed to find user profiles: ${error}`,
          error,
        });
      }
    },
  });
