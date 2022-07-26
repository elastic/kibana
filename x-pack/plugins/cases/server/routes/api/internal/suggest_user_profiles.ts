/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_SUGGEST_USER_PROFILES_URL } from '../../../../common/constants';
import { SuggestUserProfilesRequest } from '../../../../common/api';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { escapeHatch } from '../utils';

export const suggestUserProfilesRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_SUGGEST_USER_PROFILES_URL,
  params: {
    body: escapeHatch,
  },
  handler: async ({ context, request, response }) => {
    const params = request.body as SuggestUserProfilesRequest;

    try {
      const casesContext = await context.cases;
      const casesClient = await casesContext.getCasesClient();

      return response.ok({
        body: await casesClient.userProfiles.suggestUserProfiles(params),
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to find user profiles for name: ${params.name}: ${error}`,
        error,
      });
    }
  },
});
