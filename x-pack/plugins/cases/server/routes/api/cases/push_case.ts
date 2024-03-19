/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { caseDomainV1 } from '@kbn/cases-common-types';
import { caseApiV1 } from '@kbn/cases-common-types';
import { CASE_PUSH_URL } from '@kbn/cases-common-constants';
import { decodeWithExcessOrThrow } from '../../../common/runtime_types';
import type { CaseRoute } from '../types';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';

export const pushCaseRoute: CaseRoute = createCasesRoute({
  method: 'post',
  path: CASE_PUSH_URL,
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const params = decodeWithExcessOrThrow(caseApiV1.CasePushRequestParamsRt)(request.params);
      const res: caseDomainV1.Case = await casesClient.cases.push({
        caseId: params.case_id,
        connectorId: params.connector_id,
      });

      return response.ok({
        body: res,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to push case in route: ${error}`,
        error,
      });
    }
  },
});
