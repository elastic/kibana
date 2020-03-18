/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { RouteDeps } from '../../types';
import { wrapError } from '../../utils';

/*
 * Be aware that this api will only return 20 connectors
 */

const CASE_SERVICE_NOW_ACTION = '.servicenow';

export function initCaseConfigureGetActionConnector({ caseService, router }: RouteDeps) {
  router.get(
    {
      path: '/api/cases/configure/connectors/_find',
      validate: false,
    },
    async (context, request, response) => {
      try {
        const actionsClient = await context.actions?.getActionsClient();

        if (actionsClient == null) {
          throw Boom.notFound('Action client have not been found');
        }

        const results = await actionsClient.find({
          options: {
            filter: `action.attributes.actionTypeId: ${CASE_SERVICE_NOW_ACTION}`,
          },
        });
        return response.ok({ body: { ...results } });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
