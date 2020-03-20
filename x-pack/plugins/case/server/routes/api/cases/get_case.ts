/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { CaseResponseRt } from '../../../../common/api';
import { RouteDeps } from '../types';
import { flattenCaseSavedObject, wrapError } from '../utils';

export function initGetCaseApi({ caseService, router }: RouteDeps) {
  router.get(
    {
      path: '/api/cases/{case_id}',
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
        const includeComments = JSON.parse(request.query.includeComments);

        const theCase = await caseService.getCase({
          client: context.core.savedObjects.client,
          caseId: request.params.case_id,
        });

        if (!includeComments) {
          return response.ok({ body: CaseResponseRt.encode(flattenCaseSavedObject(theCase, [])) });
        }

        const theComments = await caseService.getAllCaseComments({
          client: context.core.savedObjects.client,
          caseId: request.params.case_id,
        });

        return response.ok({
          body: CaseResponseRt.encode(flattenCaseSavedObject(theCase, theComments.saved_objects)),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
