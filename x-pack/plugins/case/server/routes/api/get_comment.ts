/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RouteDeps } from '.';
import { flattenCommentSavedObject, wrapError } from './utils';
import { CASES_API_BASE_URL } from '../../constants';

export function initGetCommentApi({ caseService, router }: RouteDeps) {
  router.get(
    {
      path: `${CASES_API_BASE_URL}/comments/{id}`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const theComment = await caseService.getComment({
          client: context.core.savedObjects.client,
          commentId: request.params.id,
        });
        return response.ok({ body: flattenCommentSavedObject(theComment) });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
