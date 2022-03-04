/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_CONFIGURE_URL } from '../../../../common/constants';
import { GetConfigureFindRequest } from '../../../../common/api';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';

export const getCaseConfigureRoute = createCasesRoute({
  method: 'get',
  path: CASE_CONFIGURE_URL,
  handler: async ({ context, request, response }) => {
    try {
      const client = await context.cases.getCasesClient();
      const options = request.query as GetConfigureFindRequest;

      return response.ok({
        body: await client.configure.get({ ...options }),
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get case configure in route: ${error}`,
        error,
      });
    }
  },
});
