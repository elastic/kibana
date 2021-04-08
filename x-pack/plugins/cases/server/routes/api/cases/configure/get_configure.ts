/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDeps } from '../../types';
import { wrapError } from '../../utils';
import { CASE_CONFIGURE_URL } from '../../../../../common/constants';

export function initGetCaseConfigure({ router, logger }: RouteDeps) {
  router.get(
    {
      path: CASE_CONFIGURE_URL,
      validate: false,
    },
    async (context, request, response) => {
      try {
        const client = await context.cases.getCasesClient();

        return response.ok({
          body: await client.configure.get(),
        });
      } catch (error) {
        logger.error(`Failed to get case configure in route: ${error}`);
        return response.customError(wrapError(error));
      }
    }
  );
}
