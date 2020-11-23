/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import { CaseConfigureResponseRt, ConnectorMappingsAttributes } from '../../../../../common/api';
import { RouteDeps } from '../../types';
import { wrapError } from '../../utils';
import { CASE_CONFIGURE_URL } from '../../../../../common/constants';
import { transformESConnectorToCaseConnector } from '../helpers';

export function initGetCaseConfigure({ caseConfigureService, router }: RouteDeps) {
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
        let mappings: ConnectorMappingsAttributes[] = [];
        if (connector != null) {
          if (!context.case) {
            throw Boom.badRequest('RouteHandlerContext is not registered for cases');
          }
          const caseClient = context.case.getCaseClient();
          const actionsClient = await context.actions?.getActionsClient();
          if (actionsClient == null) {
            throw Boom.notFound('Action client have not been found');
          }
          mappings = await caseClient.getMappings({
            actionsClient,
            caseClient,
            connectorId: connector.id,
            connectorType: connector.type,
          });
        }

        return response.ok({
          body:
            myCaseConfigure.saved_objects.length > 0
              ? CaseConfigureResponseRt.encode({
                  ...caseConfigureWithoutConnector,
                  connector: transformESConnectorToCaseConnector(connector),
                  mappings,
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
