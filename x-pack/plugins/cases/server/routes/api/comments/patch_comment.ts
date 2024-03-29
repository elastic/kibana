/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { AttachmentPatchRequestRt } from '../../../../common/types/api';
import { decodeWithExcessOrThrow } from '../../../common/runtime_types';
import { CASE_COMMENTS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import type { caseDomainV1 } from '../../../../common/types/domain';

export const patchCommentRoute = createCasesRoute({
  method: 'patch',
  path: CASE_COMMENTS_URL,
  params: {
    params: schema.object({
      case_id: schema.string(),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const query = decodeWithExcessOrThrow(AttachmentPatchRequestRt)(request.body);

      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();
      const res: caseDomainV1.Case = await client.attachments.update({
        caseID: request.params.case_id,
        updateRequest: query,
      });

      return response.ok({
        body: res,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to patch comment in route case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
