/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { attachmentApiV1 } from '../../../../common/types/api';
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
  routerOptions: {
    access: 'public',
    summary: `Find case comments and alerts`,
    tags: ['oas-tag:cases'],
    description: 'Retrieves a paginated list of comments and alerts for a case.',
    // You must have `read` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases with the comments you're seeking.
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();
      const query = request.query as attachmentApiV1.FindAttachmentsQueryParams;

      const res: attachmentApiV1.AttachmentsFindResponse = await client.attachments.find({
        caseID: request.params.case_id,
        findQueryParams: query,
      });

      return response.ok({
        body: res,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to find comments in route case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
