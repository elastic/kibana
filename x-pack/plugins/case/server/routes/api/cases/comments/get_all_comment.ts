/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { AllCommentsResponseRt } from '../../../../../common/api';
import { RouteDeps } from '../../types';
import { flattenCommentSavedObjects, wrapError } from '../../utils';
import { CASE_COMMENTS_URL } from '../../../../../common/constants';

export function initGetAllCommentsApi({ caseService, router }: RouteDeps) {
  router.get(
    {
      path: CASE_COMMENTS_URL,
      validate: {
        params: schema.object({
          case_id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const client = context.core.savedObjects.client;
        const comments = await caseService.getAllCaseComments({
          client,
          caseId: request.params.case_id,
        });
        return response.ok({
          body: AllCommentsResponseRt.encode(flattenCommentSavedObjects(comments.saved_objects)),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
