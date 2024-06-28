/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { BulkGetAttachmentsRequestRt } from '../../../../common/types/api/attachment/v1';
import { decodeWithExcessOrThrow } from '../../../common/runtime_types';
import type { attachmentApiV1 } from '../../../../common/types/api';

import { INTERNAL_BULK_GET_ATTACHMENTS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { escapeHatch } from '../utils';

export const bulkGetAttachmentsRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_BULK_GET_ATTACHMENTS_URL,
  params: {
    params: schema.object({
      case_id: schema.string(),
    }),
    body: escapeHatch,
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();

      const requestBody: attachmentApiV1.BulkGetAttachmentsRequest = decodeWithExcessOrThrow(
        BulkGetAttachmentsRequestRt
      )(request.body);

      const res: attachmentApiV1.BulkGetAttachmentsResponse = await client.attachments.bulkGet({
        caseID: request.params.case_id,
        attachmentIDs: requestBody.ids,
      });

      return response.ok({
        body: res,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to bulk get attachments in route case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
