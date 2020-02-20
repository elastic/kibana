/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RouteDeps } from '.';
import { flattenCaseSavedObject, wrapError } from './utils';
import { CASES_API_BASE_URL } from '../../constants';

export function initGetCaseApi({ caseService, router }: RouteDeps) {
  router.get(
    {
      path: `${CASES_API_BASE_URL}/{id}`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        query: schema.object({
          includeComments: schema.string({ defaultValue: 'true' }),
        }),
      },
    },
    async (context, request, response) => {
      let theCase;
      const includeComments = JSON.parse(request.query.includeComments);
      try {
        theCase = await caseService.getCase({
          client: context.core.savedObjects.client,
          caseId: request.params.id,
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
      if (!includeComments) {
        return response.ok({ body: flattenCaseSavedObject(theCase, []) });
      }
      try {
        const theComments = await caseService.getAllCaseComments({
          client: context.core.savedObjects.client,
          caseId: request.params.id,
        });
        return response.ok({
          body: { ...flattenCaseSavedObject(theCase, theComments.saved_objects) },
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
