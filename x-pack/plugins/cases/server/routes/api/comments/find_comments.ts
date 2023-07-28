/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { FindAttachmentsQueryParamsRt } from '../../../../common/types/api';
import { decodeWithExcessOrThrow } from '../../../../common/api';
import { CASE_FIND_ATTACHMENTS_URL } from '../../../../common/constants';
import { createCasesRoute } from '../create_cases_route';
import { createCaseError } from '../../../common/error';

export const findCommentsRoute = createCasesRoute({
  method: 'get',
  path: CASE_FIND_ATTACHMENTS_URL,
  params: {
    params: schema.object({
      case_id: schema.string(),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const query = decodeWithExcessOrThrow(FindAttachmentsQueryParamsRt)(request.query);

      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();
      return response.ok({
        body: await client.attachments.find({
          caseID: request.params.case_id,
          findQueryParams: query,
        }),
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to find comments in route case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
