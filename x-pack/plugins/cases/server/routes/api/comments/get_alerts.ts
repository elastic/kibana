/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { CASE_DETAILS_ALERTS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';

export const getAllAlertsAttachedToCaseRoute = createCasesRoute({
  method: 'get',
  path: CASE_DETAILS_ALERTS_URL,
  params: {
    params: schema.object({
      case_id: schema.string({ minLength: 1 }),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseId = request.params.case_id;

      const casesClient = await context.cases.getCasesClient();

      return response.ok({
        body: await casesClient.attachments.getAllAlertsAttachToCase({ caseId }),
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve alert ids for this case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
