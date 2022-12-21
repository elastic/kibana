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

import { CommentPatchRequestRt, throwErrors } from '../../../../common/api';
import { CASE_COMMENTS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';

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
      const query = pipe(
        CommentPatchRequestRt.decode(request.body),
        fold(throwErrors(Boom.badRequest), identity)
      );

      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();

      return response.ok({
        body: await client.attachments.update({
          caseID: request.params.case_id,
          updateRequest: query,
        }),
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to patch comment in route case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
