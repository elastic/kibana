/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { AllCommentsResponseRt } from '../../../../../common/api';
import { RouteDeps } from '../../types';
import { flattenCommentSavedObjects, wrapError } from '../../utils';

export function initGetAllCommentsApi({ caseService, router }: RouteDeps) {
  router.get(
    {
      path: '/api/cases/{case_id}/comments',
      validate: {
        params: schema.object({
          case_id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const comments = await caseService.getAllCaseComments({
          client: context.core.savedObjects.client,
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
