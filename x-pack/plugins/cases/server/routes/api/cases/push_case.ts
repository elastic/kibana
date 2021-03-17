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

import { wrapError, escapeHatch } from '../utils';

import { throwErrors, CasePushRequestParamsRt } from '../../../../common';
import { RouteDeps } from '../types';
import { CASE_PUSH_URL } from '../../../../common';

export function initPushCaseApi({ router, logger }: RouteDeps) {
  router.post(
    {
      path: CASE_PUSH_URL,
      validate: {
        params: escapeHatch,
        body: escapeHatch,
      },
    },
    async (context, request, response) => {
      try {
        if (!context.cases) {
          return response.badRequest({ body: 'RouteHandlerContext is not registered for cases' });
        }

        const casesClient = context.cases.getCasesClient();
        const actionsClient = context.actions?.getActionsClient();

        if (actionsClient == null) {
          return response.badRequest({ body: 'Action client not found' });
        }

        const params = pipe(
          CasePushRequestParamsRt.decode(request.params),
          fold(throwErrors(Boom.badRequest), identity)
        );

        return response.ok({
          body: await casesClient.push({
            actionsClient,
            caseId: params.case_id,
            connectorId: params.connector_id,
          }),
        });
      } catch (error) {
        logger.error(`Failed to push case in route: ${error}`);
        return response.customError(wrapError(error));
      }
    }
  );
}
