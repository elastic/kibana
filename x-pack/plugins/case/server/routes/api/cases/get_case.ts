/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDeps } from '../types';
import { wrapError } from '../utils';
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
      if (!context.case) {
        return response.badRequest({ body: 'RouteHandlerContext is not registered for cases' });
      }

      const caseClient = context.case.getCaseClient();
      const includeComments = JSON.parse(request.query.includeComments);
      const id = request.params.case_id;

      try {
        return response.ok({
          body: await caseClient.get({ id, includeComments }),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
