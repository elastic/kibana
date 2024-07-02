/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { alertApiV1 } from '../../../../common/types/api';

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
  routerOptions: {
    access: 'public',
    summary: `Get all alerts for a case`,
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseId = request.params.case_id;

      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const res: alertApiV1.AlertResponse = await casesClient.attachments.getAllAlertsAttachToCase({
        caseId,
      });

      return response.ok({
        body: res,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve alert ids for this case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
