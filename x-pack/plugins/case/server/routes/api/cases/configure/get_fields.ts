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

/*
 * Be aware that this api will only return 20 connectors
 */

export function initCaseConfigureGetFields({ router }: RouteDeps) {
  router.get(
    {
      path: CASE_CONFIGURE_CONNECTOR_DETAILS_URL,
      validate: {
        params: schema.object({
          connector_id: schema.string(),
        }),
        query: schema.object({
          connectorType: schema.string({ defaultValue: '.none' }),
        }),
      },
    },
    async (context, request, response) => {
      try {
        console.log('START!!!', request.query.connectorType);
        const actionsClient = await context.actions?.getActionsClient();

        if (actionsClient == null) {
          throw Boom.notFound('Action client have not been found');
        }
        console.log('connector_id!!!', request.params.connector_id);
        const results = await actionsClient.execute({
          actionId: request.params.connector_id,
          params: {
            subAction: 'getFields',
            subActionParams: {},
          },
        });
        console.log('GET FIELDS RESULTS', results);
        return response.ok({ body: results });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
