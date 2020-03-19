/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import { flattenCaseSavedObject, transformNewCase, wrapError, escapeHatch } from '../utils';

import { CaseRequestRt, throwErrors, CaseResponseRt } from '../../../../common/api';
import { RouteDeps } from '../types';

export function initPostCaseApi({ caseService, router }: RouteDeps) {
  router.post(
    {
      path: '/api/cases',
      validate: {
        body: escapeHatch,
      },
    },
    async (context, request, response) => {
      try {
        const query = pipe(
          CaseRequestRt.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const createdBy = await caseService.getUser({ request, response });
        const createdDate = new Date().toISOString();
        const newCase = await caseService.postNewCase({
          client: context.core.savedObjects.client,
          attributes: transformNewCase({
            createdDate,
            newCase: query,
            ...createdBy,
          }),
        });
        return response.ok({ body: CaseResponseRt.encode(flattenCaseSavedObject(newCase, [])) });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
