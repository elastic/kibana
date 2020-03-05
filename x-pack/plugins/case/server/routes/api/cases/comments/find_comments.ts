/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import Boom from 'boom';

import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import {
  CommentsResponseRt,
  SavedObjectFindOptionsRt,
  throwErrors,
} from '../../../../../common/api';
import { RouteDeps } from '../../types';
import { escapeHatch, transformComments, wrapError } from '../../utils';

export function initFindCaseCommentsApi({ caseService, router }: RouteDeps) {
  router.get(
    {
      path: '/api/cases/{case_id}/comments/_find',
      validate: {
        params: schema.object({
          case_id: schema.string(),
        }),
        query: escapeHatch,
      },
    },
    async (context, request, response) => {
      try {
        const query = pipe(
          SavedObjectFindOptionsRt.decode(request.query),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const args = query
          ? {
              client: context.core.savedObjects.client,
              caseId: request.params.case_id,
              options: {
                ...query,
                sortField: 'created_at',
              },
            }
          : {
              client: context.core.savedObjects.client,
              caseId: request.params.case_id,
            };

        const theComments = await caseService.getAllCaseComments(args);
        return response.ok({ body: CommentsResponseRt.encode(transformComments(theComments)) });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
