/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { INTERNAL_DELETE_FILE_ATTACHMENTS_URL } from '../../../../common/constants';
import { createCasesRoute } from '../create_cases_route';
import { createCaseError } from '../../../common/error';
import { MAX_DELETE_FILES } from '../../../files';

export const deleteFileAttachments = createCasesRoute({
  method: 'delete',
  path: INTERNAL_DELETE_FILE_ATTACHMENTS_URL,
  params: {
    params: schema.object({
      case_id: schema.string(),
    }),
    query: schema.object({
      ids: schema.arrayOf(schema.string({ minLength: 1 }), {
        minSize: 1,
        maxSize: MAX_DELETE_FILES,
      }),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();
      await client.attachments.deleteFileAttachments({
        caseId: request.params.case_id,
        fileIds: request.query.ids,
      });

      return response.noContent();
    } catch (error) {
      throw createCaseError({
        message: `Failed to delete files in route case id: ${request.params.case_id} file ids: ${request.query.ids}: ${error}`,
        error,
      });
    }
  },
});
