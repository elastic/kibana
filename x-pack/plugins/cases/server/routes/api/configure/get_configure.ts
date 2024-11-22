/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_CONFIGURE_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import type { configureApiV1 } from '../../../../common/types/api';

export const getCaseConfigureRoute = createCasesRoute({
  method: 'get',
  path: CASE_CONFIGURE_URL,
  routerOptions: {
    access: 'public',
    summary: 'Get case settings',
    description:
      'Retrieves setting details such as the closure type, custom fields, templates, and the default connector for cases.',
    // You must have `read` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on where the cases were created.
    tags: ['oas-tag:cases'],
  },
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
