/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { INTERNAL_BULK_CREATE_ATTACHMENTS_URL } from '../../../../common/constants';
import { BulkCreateCommentRequest } from '../../../../common/api';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { escapeHatch } from '../utils';

export const bulkCreateAttachmentsRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_BULK_CREATE_ATTACHMENTS_URL,
  params: {
    params: schema.object({
      case_id: schema.string(),
    }),
    body: schema.arrayOf(escapeHatch),
  },
  handler: async ({ context, request, response }) => {
    try {
      const casesContext = await context.cases;
      const casesClient = await casesContext.getCasesClient();
      const caseId = request.params.case_id;
      const attachments = request.body as BulkCreateCommentRequest;

      return response.ok({
        body: await casesClient.attachments.bulkCreate({ caseId, attachments }),
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to bulk create attachments in route case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
