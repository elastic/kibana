/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import mime from 'mime-types';
import { parse } from 'path';

import { schema } from '@kbn/config-schema';
import { ReplaySubject } from 'rxjs';

import { AbortedUploadError } from '@kbn/files-plugin/server/file/errors';
import type { HapiReadableStream } from '../../../client/attachments/types';
import type { attachmentApiV1 } from '../../../../common/types/api';

import { CASE_FILES_URL, MAX_FILE_SIZE } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
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
      output: 'stream',
      parse: true,
      accepts: 'multipart/form-data',
    },
  },
  handler: async ({ context, request, response }) => {
    const $abort = new ReplaySubject();
    const sub = request.events.aborted$.subscribe($abort);

    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const fileRequest = request.body as attachmentApiV1.PostFileAttachmentRequest;
      const file = fileRequest.file as HapiReadableStream;

      const fileExtension = parse(file.hapi.filename).ext.toLowerCase();
      const metadataMimeType = mime.lookup(fileExtension) || '';
      const metadataFilename = parse(file.hapi.filename).name;

      const res: caseDomainV1.Case = await casesClient.attachments.addFile({
        file,
        filename: fileRequest.filename ?? metadataFilename,
        mimeType: fileRequest.mimeType ?? metadataMimeType,
        caseId: request.params.case_id,
        $abort,
      });

      return response.ok({
        body: res,
      });
    } catch (error) {
      if (error instanceof AbortedUploadError) {
        throw new Boom.Boom(error, {
          statusCode: 499,
          message: error.message,
        });
      }
      throw createCaseError({
        message: `Failed to attach file to case in route: ${error}`,
        error,
      });
    } finally {
      sub.unsubscribe();
    }
  },
});
