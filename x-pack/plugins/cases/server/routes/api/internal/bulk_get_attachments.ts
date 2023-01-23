/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkGetCommentsRequest } from '../../../../common/api';

import { INTERNAL_BULK_GET_ATTACHMENTS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { escapeHatch } from '../utils';

export const bulkGetAttachmentsRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_BULK_GET_ATTACHMENTS_URL,
  params: {
    body: escapeHatch,
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();
      const body = request.body as BulkGetCommentsRequest;

      return response.ok({
        body: await client.attachments.bulkGet({
          attachmentIDs: body.ids,
        }),
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to bulk get attachments in route: ${error}`,
        error,
      });
    }
  },
});
