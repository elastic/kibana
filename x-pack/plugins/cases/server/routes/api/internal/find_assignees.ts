/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UserProfileService } from '../../../services';
import { INTERNAL_FIND_ASSIGNEES_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';

export const findAssigneesRoute = (userProfileService: UserProfileService) =>
  createCasesRoute({
    method: 'get',
    path: INTERNAL_FIND_ASSIGNEES_URL,
    routerOptions: {
      tags: ['access:casesFindAssignedUsers'],
    },
    params: {
      query: schema.object({
        owners: schema.arrayOf(schema.string()),
        searchTerm: schema.string(),
        size: schema.maybe(schema.number()),
      }),
    },
    handler: async ({ request, response, context }) => {
      try {
        const casesContext = await context.cases;
        const casesClient = await casesContext.getCasesClient();
        return response.ok({
          body: await userProfileService.findAssignees(request, casesClient),
        });
      } catch (error) {
        throw createCaseError({
          message: `Failed to find user profiles: ${error}`,
          error,
        });
      }
    },
  });
