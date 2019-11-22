/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RouteDeps } from '.';
import { wrapError } from './utils';
import { CASE_COMMENT_SAVED_OBJECT } from '../../constants';

export function initGetAllCaseCommentsApi({ log, router }: RouteDeps) {
  router.get(
    {
      path: '/api/cases/{id}/comments',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        log.debug(`Attempting to GET all comments for case ${request.params.id}`);
        const options = {
          type: CASE_COMMENT_SAVED_OBJECT,
          search: request.params.id,
          searchFields: ['case_workflow_id'],
        };
        const theComments = await context.core.savedObjects.client.find(options);
        return response.ok({ body: theComments });
      } catch (error) {
        log.debug(`Error on GET all comments for case  ${request.params.id}: ${error}`);
        return response.customError(wrapError(error));
      }
    }
  );
}
