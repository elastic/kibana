/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CASE_OBSERVABLES_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import type { observableApiV1 } from '../../../../common/types/api';

export const postObservableRoute = createCasesRoute({
  method: 'post',
  path: CASE_OBSERVABLES_URL,
  params: {
    params: schema.object({
      case_id: schema.string(),
    }),
  },
  routerOptions: {
    access: 'public',
    summary: `Add a case observable`,
    tags: ['oas-tag:cases'],
    description: 'Each case can have a maximum of 10 observables.',
    // You must have `all` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the case you're creating.
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const caseId = request.params.case_id;
      const { observables, version } = request.body as observableApiV1.ObservableRequest;
      const cases = await casesClient.cases.bulkUpdate({
        cases: [
          {
            id: caseId,
            observables,
            version,
          },
        ],
      });

      return response.ok({
        body: cases[0],
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to post observable in route case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
