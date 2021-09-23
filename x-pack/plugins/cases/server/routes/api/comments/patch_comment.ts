/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { schema } from '@kbn/config-schema';
import Boom from '@hapi/boom';

import { RouteDeps } from '../types';
import { escapeHatch, wrapError } from '../utils';
import { CASE_COMMENTS_URL, CommentPatchRequestRt, throwErrors } from '../../../../common';

export function initPatchCommentApi({ router, logger }: RouteDeps) {
  router.patch(
    {
      path: CASE_COMMENTS_URL,
      validate: {
        params: schema.object({
          case_id: schema.string(),
        }),
        query: schema.maybe(
          schema.object({
            subCaseId: schema.maybe(schema.string()),
          })
        ),
        body: escapeHatch,
      },
    },
    async (context, request, response) => {
      try {
        const query = pipe(
          CommentPatchRequestRt.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const client = await context.cases.getCasesClient();

        return response.ok({
          body: await client.attachments.update({
            caseID: request.params.case_id,
            subCaseID: request.query?.subCaseId,
            updateRequest: query,
          }),
        });
      } catch (error) {
        logger.error(
          `Failed to patch comment in route case id: ${request.params.case_id} sub case id: ${request.query?.subCaseId}: ${error}`
        );
        return response.customError(wrapError(error));
      }
    }
  );
}
