/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_CONFIGURE_CONNECTORS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';

/*
 * Be aware that this api will only return 20 connectors
 */
export const getConnectorsRoute = createCasesRoute({
  method: 'get',
  path: `${CASE_CONFIGURE_CONNECTORS_URL}/_find`,
  handler: async ({ context, response }) => {
    try {
      const client = await context.cases.getCasesClient();

      return response.ok({ body: await client.configure.getConnectors() });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get connectors in route: ${error}`,
        error,
      });
    }
  },
});
