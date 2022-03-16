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

import {
  CaseConfigureRequestParamsRt,
  throwErrors,
  CasesConfigurePatch,
  excess,
} from '../../../../common/api';
import { CASE_CONFIGURE_DETAILS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';

export const patchCaseConfigureRoute = createCasesRoute({
  method: 'patch',
  path: CASE_CONFIGURE_DETAILS_URL,
  handler: async ({ context, request, response }) => {
    try {
      const params = pipe(
        excess(CaseConfigureRequestParamsRt).decode(request.params),
        fold(throwErrors(Boom.badRequest), identity)
      );

      const client = await context.cases.getCasesClient();
      const configuration = request.body as CasesConfigurePatch;

      return response.ok({
        body: await client.configure.update(params.configuration_id, configuration),
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to patch configure in route: ${error}`,
        error,
      });
    }
  },
});
