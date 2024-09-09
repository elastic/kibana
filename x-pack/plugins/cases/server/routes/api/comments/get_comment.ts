/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { CASE_COMMENT_DETAILS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import type { attachmentDomainV1 } from '../../../../common/types/domain';

export const getCommentRoute = createCasesRoute({
  method: 'get',
  path: CASE_COMMENT_DETAILS_URL,
  params: {
    params: schema.object({
      case_id: schema.string(),
      comment_id: schema.string(),
    }),
  },
  routerOptions: {
    access: 'public',
    summary: `Get a case comment or alert`,
    // decription: 'You must have `read` privileges for the **Cases** feature in the **Management**, **Observability**, or **Security** section of the Kibana feature privileges, depending on the owner of the cases with the comments you're seeking.',
    tags: ['oas-tag:cases'],
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();
      const res: attachmentDomainV1.Attachment = await client.attachments.get({
        attachmentID: request.params.comment_id,
        caseID: request.params.case_id,
      });

      return response.ok({
        body: res,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get comment in route case id: ${request.params.case_id} comment id: ${request.params.comment_id}: ${error}`,
        error,
      });
    }
  },
});
