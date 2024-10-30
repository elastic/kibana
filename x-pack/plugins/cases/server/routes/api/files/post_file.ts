/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CASE_FILES_URL, MAX_FILE_SIZE } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import type { attachmentApiV1 } from '../../../../common/types/api';
import type { caseDomainV1 } from '../../../../common/types/domain';

export const postFileRoute = createCasesRoute({
  method: 'post',
  path: CASE_FILES_URL,
  params: {
    params: schema.object({
      case_id: schema.string(),
    }),
  },
  routerOptions: {
    access: 'public',
    summary: 'Attach a file to a case',
    tags: ['oas-tag:cases'],
    body: {
      /*
       * The maximum file size allowed here is the upper limit allowed when registering the cases file
       * kinds. We register the file kinds in x-pack/plugins/cases/public/files/index.ts.
       *
       * If the user configured a custom value the validation will still fail when calling the service.
       */
      maxBytes: MAX_FILE_SIZE,
      accepts: 'multipart/form-data',
    },
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const fileRequest = request.body as attachmentApiV1.PostFileAttachmentRequest;
      const caseId = request.params.case_id;

      const res: caseDomainV1.Case = await casesClient.attachments.addFile({ fileRequest, caseId });

      return response.ok({
        body: res,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to attach file to case in route: ${error}`,
        error,
      });
    }
  },
});
