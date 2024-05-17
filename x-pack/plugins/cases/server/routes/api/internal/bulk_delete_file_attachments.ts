/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { INTERNAL_DELETE_FILE_ATTACHMENTS_URL } from '../../../../common/constants';
import type { attachmentApiV1 } from '../../../../common/types/api';
import { BulkDeleteFileAttachmentsRequestRt } from '../../../../common/types/api/attachment/v1';
import { createCaseError } from '../../../common/error';
import { decodeWithExcessOrThrow } from '../../../common/runtime_types';
import { createCasesRoute } from '../create_cases_route';
import { escapeHatch } from '../utils';

export const bulkDeleteFileAttachments = createCasesRoute({
  method: 'post',
  path: INTERNAL_DELETE_FILE_ATTACHMENTS_URL,
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
      const requestBody: attachmentApiV1.BulkDeleteFileAttachmentsRequest = decodeWithExcessOrThrow(
        BulkDeleteFileAttachmentsRequestRt
      )(request.body);

      await client.attachments.bulkDeleteFileAttachments({
        caseId: request.params.case_id,
        fileIds: requestBody.ids,
      });

      return response.noContent();
    } catch (error) {
      throw createCaseError({
        message: `Failed to delete files in route case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
