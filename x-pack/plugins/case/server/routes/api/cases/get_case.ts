/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { CaseResponseRt } from '../../../../common/api';
import { RouteDeps } from '../types';
import { flattenCaseSavedObject, wrapError } from '../utils';
import { CASE_DETAILS_URL } from '../../../../common/constants';

export function initGetCaseApi({ caseConfigureService, caseService, router }: RouteDeps) {
  router.get(
    {
      path: CASE_DETAILS_URL,
      validate: {
        params: schema.object({
          case_id: schema.string(),
        }),
        query: schema.object({
          includeComments: schema.string({ defaultValue: 'true' }),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const client = context.core.savedObjects.client;
        const includeComments = JSON.parse(request.query.includeComments);

        const [theCase] = await Promise.all([
          caseService.getCase({
            client,
            caseId: request.params.case_id,
          }),
        ]);

        if (!includeComments) {
          return response.ok({
            body: CaseResponseRt.encode(
              flattenCaseSavedObject({
                savedObject: theCase,
              })
            ),
          });
        }

        const theComments = await caseService.getAllCaseComments({
          client,
          caseId: request.params.case_id,
          options: {
            sortField: 'created_at',
            sortOrder: 'asc',
          },
        });

        return response.ok({
          body: CaseResponseRt.encode(
            flattenCaseSavedObject({
              savedObject: theCase,
              comments: theComments.saved_objects,
              totalComment: theComments.total,
            })
          ),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
