/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import { throwErrors, CasePushRequestParamsRt } from '../../../../common/api';
import { CASE_PUSH_URL } from '../../../../common/constants';
import { CaseRoute } from '../types';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';

export const pushCaseRoute: CaseRoute = createCasesRoute({
  method: 'post',
  path: CASE_PUSH_URL,
  handler: async ({ context, request, response }) => {
    try {
      const casesClient = await context.cases.getCasesClient();

      const params = pipe(
        CasePushRequestParamsRt.decode(request.params),
        fold(throwErrors(Boom.badRequest), identity)
      );

      return response.ok({
        body: await casesClient.cases.push({
          caseId: params.case_id,
          connectorId: params.connector_id,
        }),
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to push case in route: ${error}`,
        error,
      });
    }
  },
});
