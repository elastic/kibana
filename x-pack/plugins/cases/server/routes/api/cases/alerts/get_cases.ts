/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { CasesByAlertIDRequest } from '../../../../../common/api';
import { CASE_ALERTS_URL } from '../../../../../common/constants';
import { createCaseError } from '../../../../common/error';
import { createCasesRoute } from '../../create_cases_route';

export const getCasesByAlertIdRoute = createCasesRoute({
  method: 'get',
  path: CASE_ALERTS_URL,
  params: {
    params: schema.object({
      alert_id: schema.string({ minLength: 1 }),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const alertID = request.params.alert_id;

      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const options = request.query as CasesByAlertIDRequest;

      return response.ok({
        body: await casesClient.cases.getCasesByAlertID({ alertID, options }),
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve case ids for this alert id: ${request.params.alert_id}: ${error}`,
        error,
      });
    }
  },
});
