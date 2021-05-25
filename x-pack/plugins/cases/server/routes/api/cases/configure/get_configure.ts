/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { CaseConfigureResponseRt, ConnectorMappingsAttributes } from '../../../../../common';
import { RouteDeps } from '../../types';
import { wrapError } from '../../utils';
import { CASE_CONFIGURE_URL } from '../../../../../common';
import { transformESConnectorToCaseConnector } from '../helpers';

export function initGetCaseConfigure({ caseConfigureService, router, logger }: RouteDeps) {
  router.get(
    {
      path: CASE_CONFIGURE_URL,
      validate: false,
    },
    async (context, request, response) => {
      try {
        let error = null;
        const client = context.core.savedObjects.client;

        const myCaseConfigure = await caseConfigureService.find({ client });

        const { connector, ...caseConfigureWithoutConnector } = myCaseConfigure.saved_objects[0]
          ?.attributes ?? { connector: null };
        let mappings: ConnectorMappingsAttributes[] = [];
        if (connector != null) {
          if (!context.cases) {
            throw Boom.badRequest('RouteHandlerContext is not registered for cases');
          }
          const casesClient = context.cases.getCasesClient();
          const actionsClient = context.actions?.getActionsClient();
          if (actionsClient == null) {
            throw Boom.notFound('Action client not found');
          }
          try {
            mappings = await casesClient.getMappings({
              actionsClient,
              connectorId: connector.id,
              connectorType: connector.type,
            });
          } catch (e) {
            error = e.isBoom
              ? e.output.payload.message
              : `Error connecting to ${connector.name} instance`;
          }
        }

        return response.ok({
          body:
            myCaseConfigure.saved_objects.length > 0
              ? CaseConfigureResponseRt.encode({
                  ...caseConfigureWithoutConnector,
                  connector: transformESConnectorToCaseConnector(connector),
                  mappings,
                  version: myCaseConfigure.saved_objects[0].version ?? '',
                  error,
                })
              : {},
        });
      } catch (error) {
        logger.error(`Failed to get case configure in route: ${error}`);
        return response.customError(wrapError(error));
      }
    }
  );
}
