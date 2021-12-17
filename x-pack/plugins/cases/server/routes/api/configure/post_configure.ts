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

import { CasesConfigureRequestRt, throwErrors } from '../../../../common/api';
import { CASE_CONFIGURE_URL } from '../../../../common/constants';
import { RouteDeps } from '../types';
import { wrapError, escapeHatch } from '../utils';

export function initPostCaseConfigure({ router, logger }: RouteDeps) {
  router.post(
    {
      path: CASE_CONFIGURE_URL,
      validate: {
        body: escapeHatch,
      },
    },
    async (context, request, response) => {
      try {
        const query = pipe(
          CasesConfigureRequestRt.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const client = await context.cases.getCasesClient();

        return response.ok({
          body: await client.configure.create(query),
        });
      } catch (error) {
        logger.error(`Failed to post case configure in route: ${error}`);
        return response.customError(wrapError(error));
      }
    }
  );
}
