/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { CASES_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';

export const deleteCaseRoute = createCasesRoute({
  method: 'delete',
  path: CASES_URL,
  params: {
    query: schema.object({
      ids: schema.arrayOf(schema.string()),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();
      await client.cases.delete(request.query.ids);

      return response.noContent();
    } catch (error) {
      throw createCaseError({
        message: `Failed to delete cases in route ids: ${JSON.stringify(
          request.query.ids
        )}: ${error}`,
        error,
      });
    }
  },
});
