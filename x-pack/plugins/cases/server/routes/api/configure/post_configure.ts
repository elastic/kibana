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
  routerOptions: {
    access: 'public',
    summary: 'Add case settings',
    description:
      'Case settings include external connection details, custom fields, and templates. Connectors are used to interface with external systems. You must create a connector before you can use it in your cases. If you set a default connector, it is automatically selected when you create cases in Kibana. If you use the create case API, however, you must still specify all of the connector details. You must have `all` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on where you are creating cases.',
  },
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
