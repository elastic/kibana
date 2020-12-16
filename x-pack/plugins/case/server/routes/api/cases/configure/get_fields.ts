/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { RouteDeps } from '../../types';
import { escapeHatch, wrapError } from '../../utils';

import { CASE_CONFIGURE_CONNECTOR_DETAILS_URL } from '../../../../../common/constants';
import {
  ConnectorRequestParamsRt,
  GetFieldsRequestQueryRt,
  throwErrors,
} from '../../../../../common/api';

export function initCaseConfigureGetFields({ router }: RouteDeps) {
  router.get(
    {
      path: CASE_CONFIGURE_CONNECTOR_DETAILS_URL,
      validate: {
        params: escapeHatch,
        query: escapeHatch,
      },
    },
    async (context, request, response) => {
      try {
        if (!context.case) {
          throw Boom.badRequest('RouteHandlerContext is not registered for cases');
        }
        const query = pipe(
          GetFieldsRequestQueryRt.decode(request.query),
          fold(throwErrors(Boom.badRequest), identity)
        );
        const params = pipe(
          ConnectorRequestParamsRt.decode(request.params),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const caseClient = context.case.getCaseClient();

        const connectorType = query.connector_type;
        if (connectorType == null) {
          throw Boom.illegal('no connectorType value provided');
        }

        const actionsClient = await context.actions?.getActionsClient();
        if (actionsClient == null) {
          throw Boom.notFound('Action client have not been found');
        }

        const res = await caseClient.getFields({
          actionsClient,
          connectorId: params.connector_id,
          connectorType,
        });

        return response.ok({
          body: res.fields,
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
