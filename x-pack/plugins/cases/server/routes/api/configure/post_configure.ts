/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigurationRequestRt } from '../../../../common/types/api';
import { decodeWithExcessOrThrow } from '../../../common/runtime_types';
import { CASE_CONFIGURE_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import type { configureApiV1 } from '../../../../common/types/api';

export const postCaseConfigureRoute = createCasesRoute({
  method: 'post',
  path: CASE_CONFIGURE_URL,
  handler: async ({ context, request, response }) => {
    try {
      const query = decodeWithExcessOrThrow(ConfigurationRequestRt)(request.body);

      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();
      const res: configureApiV1.CreateConfigureResponse = await client.configure.create(query);

      return response.ok({
        body: res,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to post case configure in route: ${error}`,
        error,
      });
    }
  },
});
