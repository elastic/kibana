/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { configureApiV1 } from '@kbn/cases-common-types';
import { CASE_CONFIGURE_URL } from '@kbn/cases-common-constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';

export const getCaseConfigureRoute = createCasesRoute({
  method: 'get',
  path: CASE_CONFIGURE_URL,
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();
      const options = request.query as configureApiV1.GetConfigurationFindRequest;

      const res: configureApiV1.GetConfigureResponse = await client.configure.get({ ...options });

      return response.ok({
        body: res,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get case configure in route: ${error}`,
        error,
      });
    }
  },
});
