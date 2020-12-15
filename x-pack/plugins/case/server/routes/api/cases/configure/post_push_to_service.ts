/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import Boom from '@hapi/boom';
import { RouteDeps } from '../../types';
import { escapeHatch, wrapError } from '../../utils';

import { CASE_CONFIGURE_PUSH_URL } from '../../../../../common/constants';
import {
  ConnectorRequestParamsRt,
  PostPushRequestRt,
  throwErrors,
} from '../../../../../common/api';
import { mapIncident } from './utils';

export function initPostPushToService({ router, connectorMappingsService }: RouteDeps) {
  router.post(
    {
      path: CASE_CONFIGURE_PUSH_URL,
      validate: {
        params: escapeHatch,
        body: escapeHatch,
      },
    },
    async (context, request, response) => {
      try {
        if (!context.case) {
          throw Boom.badRequest('RouteHandlerContext is not registered for cases');
        }
        const caseClient = context.case.getCaseClient();
        const actionsClient = await context.actions?.getActionsClient();
        if (actionsClient == null) {
          throw Boom.notFound('Action client have not been found');
        }
        const params = pipe(
          ConnectorRequestParamsRt.decode(request.params),
          fold(throwErrors(Boom.badRequest), identity)
        );
        const body = pipe(
          PostPushRequestRt.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const myConnectorMappings = await caseClient.getMappings({
          actionsClient,
          caseClient,
          connectorId: params.connector_id,
          connectorType: body.connector_type,
        });

        const res = await mapIncident(
          actionsClient,
          params.connector_id,
          body.connector_type,
          myConnectorMappings,
          body.params
        );
        const pushRes = await actionsClient.execute({
          actionId: params.connector_id,
          params: {
            subAction: 'pushToService',
            subActionParams: res,
          },
        });

        return response.ok({
          body: pushRes,
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
