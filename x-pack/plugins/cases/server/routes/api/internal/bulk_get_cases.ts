/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { caseApiV1 } from '../../../../common/types/api';
import { INTERNAL_BULK_GET_CASES_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { escapeHatch } from '../utils';

export const bulkGetCasesRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_BULK_GET_CASES_URL,
  params: {
    body: escapeHatch,
  },
  handler: async ({ context, request, response }) => {
    const params = request.body as caseApiV1.CasesBulkGetRequest;

    try {
      const casesContext = await context.cases;
      const casesClient = await casesContext.getCasesClient();

      const res: caseApiV1.CasesBulkGetResponse = await casesClient.cases.bulkGet({ ...params });

      return response.ok({
        body: res,
      });
    } catch (error) {
      const ids = params.ids ?? [];
      throw createCaseError({
        message: `Failed to bulk get cases in route: ${ids.join(', ')}: ${error}`,
        error,
      });
    }
  },
});
