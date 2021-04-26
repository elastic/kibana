/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDeps } from '../types';
import { wrapError } from '../utils';

import { CASE_CONFIGURE_CONNECTORS_URL } from '../../../../common/constants';

/*
 * Be aware that this api will only return 20 connectors
 */
export function initCaseConfigureGetActionConnector({ router, logger }: RouteDeps) {
  router.get(
    {
      path: `${CASE_CONFIGURE_CONNECTORS_URL}/_find`,
      validate: false,
    },
    async (context, request, response) => {
      try {
        const client = await context.cases.getCasesClient();

        return response.ok({ body: await client.configure.getConnectors() });
      } catch (error) {
        logger.error(`Failed to get connectors in route: ${error}`);
        return response.customError(wrapError(error));
      }
    }
  );
}
