/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConfigurationPatchRequest } from '../../../../common/api';
import { CaseConfigureRequestParamsRt, decodeWithExcessOrThrow } from '../../../../common/api';
import { CASE_CONFIGURE_DETAILS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';

export const patchCaseConfigureRoute = createCasesRoute({
  method: 'patch',
  path: CASE_CONFIGURE_DETAILS_URL,
  handler: async ({ context, request, response }) => {
    try {
      const params = decodeWithExcessOrThrow(CaseConfigureRequestParamsRt)(request.params);

      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();
      const configuration = request.body as ConfigurationPatchRequest;

      return response.ok({
        body: await client.configure.update(params.configuration_id, configuration),
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to patch configure in route: ${error}`,
        error,
      });
    }
  },
});
