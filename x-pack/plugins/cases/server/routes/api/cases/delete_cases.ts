/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDeps } from '../types';
import { wrapError } from '../utils';
import { CASES_URL } from '../../../../common/constants';

export function initDeleteCasesApi({ router, logger }: RouteDeps) {
  router.delete(
    {
      path: CASES_URL,
      validate: {
        query: schema.object({
          ids: schema.arrayOf(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const client = await context.cases.getCasesClient();
        await client.cases.delete(request.query.ids);

        return response.noContent();
      } catch (error) {
        logger.error(
          `Failed to delete cases in route ids: ${JSON.stringify(request.query.ids)}: ${error}`
        );
        return response.customError(wrapError(error));
      }
    }
  );
}
