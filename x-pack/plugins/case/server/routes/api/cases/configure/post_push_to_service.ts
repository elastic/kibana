/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import Boom from '@hapi/boom';
import { RouteDeps } from '../../types';
import { escapeHatch, wrapError } from '../../utils';

import { CASE_CONFIGURE_PUSH_URL } from '../../../../../common/constants';
import {
  ActionConnector,
  ConnectorRequestParamsRt,
  PostPushRequestRt,
  throwErrors,
} from '../../../../../common/api';
import { createIncident, isCommentAlertType } from './utils';

export function initPostPushToService({ router }: RouteDeps) {
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

        const connector = await actionsClient.get({ id: params.connector_id });
        const theCase = await caseClient.get({ id: body.case_id, includeComments: true });
        const userActions = await caseClient.getUserActions({ caseId: body.case_id });
        const alerts = await caseClient.getAlerts({
          ids: theCase.comments?.filter(isCommentAlertType).map((comment) => comment.alertId) ?? [],
        });

        const connectorMappings = await caseClient.getMappings({
          actionsClient,
          caseClient,
          connectorId: connector.id,
          connectorType: connector.actionTypeId,
        });

        const res = await createIncident({
          actionsClient,
          theCase,
          userActions,
          connector: connector as ActionConnector,
          mappings: connectorMappings,
          alerts,
        });

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
