/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseConfigureRequestParamsRt } from '../../../../common/types/api';
import { decodeWithExcessOrThrow } from '../../../common/runtime_types';
import { CASE_CONFIGURE_DETAILS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import type { configureApiV1 } from '../../../../common/types/api';

export const patchCaseConfigureRoute = createCasesRoute({
  method: 'patch',
  path: CASE_CONFIGURE_DETAILS_URL,
  routerOptions: {
    access: 'public',
    summary: 'Update case settings',
    description:
      'Updates case settings such as the closure type, custom fields, templates, and the default connector for cases. Connectors are used to interface with external systems. You must create a connector before you can use it in your cases.',
    // You must have `all` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on where the case was created.
    tags: ['oas-tag:cases'],
  },
  handler: async ({ context, request, response }) => {
    try {
      const params = decodeWithExcessOrThrow(CaseConfigureRequestParamsRt)(request.params);

      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();
      const configuration = request.body as configureApiV1.ConfigurationPatchRequest;
      const res: configureApiV1.UpdateConfigureResponse = await client.configure.update(
        params.configuration_id,
        configuration
      );

      return response.ok({
        body: res,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to patch configure in route: ${error}`,
        error,
      });
    }
  },
});
