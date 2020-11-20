/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import { CaseConfigureResponseRt } from '../../../../../common/api';
import { RouteDeps } from '../../types';
import { wrapError } from '../../utils';
import { CASE_CONFIGURE_URL } from '../../../../../common/constants';
import { transformESConnectorToCaseConnector } from '../helpers';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../../../actions/server/saved_objects';

export function initGetCaseConfigure({
  caseConfigureService,
  connectorMappingsService,
  router,
}: RouteDeps) {
  router.get(
    {
      path: CASE_CONFIGURE_URL,
      validate: false,
    },
    async (context, request, response) => {
      try {
        const client = context.core.savedObjects.client;

        const myCaseConfigure = await caseConfigureService.find({ client });

        const { connector, ...caseConfigureWithoutConnector } = myCaseConfigure.saved_objects[0]
          ?.attributes ?? { connector: null };

        let theMapping = null;
        if (connector != null) {
          const myConnectorMappings = await connectorMappingsService.find({
            client,
            options: {
              hasReference: {
                type: ACTION_SAVED_OBJECT_TYPE,
                id: connector.id,
              },
            },
          });
          // Create connector mappings if there are none
          if (myConnectorMappings.total === 0) {
            if (!context.case) {
              throw Boom.badRequest('RouteHandlerContext is not registered for cases');
            }
            const caseClient = context.case.getCaseClient();
            const actionsClient = await context.actions?.getActionsClient();
            if (actionsClient == null) {
              throw Boom.notFound('Action client have not been found');
            }
            const res = await caseClient.getFields({
              actionsClient,
              connectorId: connector.id,
              connectorType: connector.type,
            });
            theMapping = await connectorMappingsService.post({
              client,
              attributes: {
                mappings: res.defaultMappings,
              },
              references: [
                {
                  type: ACTION_SAVED_OBJECT_TYPE,
                  name: `associated-${ACTION_SAVED_OBJECT_TYPE}`,
                  id: connector.id,
                },
              ],
            });
          } else {
            theMapping = myConnectorMappings.saved_objects[0];
          }
        }

        return response.ok({
          body:
            myCaseConfigure.saved_objects.length > 0
              ? CaseConfigureResponseRt.encode({
                  ...caseConfigureWithoutConnector,
                  connector: transformESConnectorToCaseConnector(connector),
                  mappings: theMapping ? theMapping.attributes.mappings : [],
                  version: myCaseConfigure.saved_objects[0].version ?? '',
                })
              : {},
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
