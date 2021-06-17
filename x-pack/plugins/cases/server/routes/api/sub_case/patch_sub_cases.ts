/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SubCasesPatchRequest, SUB_CASES_PATCH_DEL_URL } from '../../../../common';
import { RouteDeps } from '../types';
import { escapeHatch, wrapError } from '../utils';

export function initPatchSubCasesApi({ router, logger }: RouteDeps) {
  router.patch(
    {
      path: SUB_CASES_PATCH_DEL_URL,
      validate: {
        body: escapeHatch,
      },
    },
    async (context, request, response) => {
      try {
        const casesClient = await context.cases.getCasesClient();
        const subCases = request.body as SubCasesPatchRequest;
        return response.ok({
          body: await casesClient.subCases.update(subCases),
        });
      } catch (error) {
        logger.error(`Failed to patch sub cases in route: ${error}`);
        return response.customError(wrapError(error));
      }
    }
  );
}
