/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { RouteDeps } from '../../types';
import { wrapError } from '../../utils';
import { SUB_CASES_PATCH_DEL_URL, SAVED_OBJECT_TYPES } from '../../../../../common/constants';

export function initDeleteSubCasesApi({ caseService, router, logger }: RouteDeps) {
  router.delete(
    {
      path: SUB_CASES_PATCH_DEL_URL,
      validate: {
        query: schema.object({
          ids: schema.arrayOf(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const soClient = context.core.savedObjects.getClient({
          includedHiddenTypes: SAVED_OBJECT_TYPES,
        });

        const user = caseService.getUser({ request });

        const client = await context.cases.getCasesClient();
        await client.subCases.delete({ soClient, ids: request.query.ids, user });

        return response.noContent();
      } catch (error) {
        logger.error(
          `Failed to delete sub cases in route ids: ${JSON.stringify(request.query.ids)}: ${error}`
        );
        return response.customError(wrapError(error));
      }
    }
  );
}
