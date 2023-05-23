/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigurationRequestRt, decodeWithExcessOrThrow } from '../../../../common/api';
import { CASE_CONFIGURE_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';

export const postCaseConfigureRoute = createCasesRoute({
  method: 'post',
  path: CASE_CONFIGURE_URL,
  handler: async ({ context, request, response }) => {
    try {
      const query = decodeWithExcessOrThrow(ConfigurationRequestRt)(request.body);

      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();

      return response.ok({
        body: await client.configure.create(query),
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to post case configure in route: ${error}`,
        error,
      });
    }
  },
});
