/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import Boom from '@hapi/boom';
import { RouteDeps } from '../../types';
import { wrapError } from '../../utils';

import { CASE_CONFIGURE_CONNECTOR_DETAILS_URL } from '../../../../../common/constants';

export function initCaseConfigureGetFields({ router }: RouteDeps) {
  router.get(
    {
      path: CASE_CONFIGURE_CONNECTOR_DETAILS_URL,
      validate: {
        params: schema.object({
          connector_id: schema.string(),
        }),
        query: schema.object({
          connector_type: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        if (!context.case) {
          throw Boom.badRequest('RouteHandlerContext is not registered for cases');
        }

        const caseClient = context.case.getCaseClient();

        const connectorType = request.query.connector_type;
        if (connectorType == null) {
          throw Boom.illegal('no connectorType value provided');
        }

        const actionsClient = await context.actions?.getActionsClient();
        if (actionsClient == null) {
          throw Boom.notFound('Action client have not been found');
        }

        const res = await caseClient.getFields({
          actionsClient,
          connectorId: request.params.connector_id,
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
