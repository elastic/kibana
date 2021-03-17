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

import {
  CasesConfigurePatchRt,
  CaseConfigureResponseRt,
  throwErrors,
  ConnectorMappingsAttributes,
} from '../../../../../common';
import { RouteDeps } from '../../types';
import { wrapError, escapeHatch } from '../../utils';
import { CASE_CONFIGURE_URL } from '../../../../../common';
import {
  transformCaseConnectorToEsConnector,
  transformESConnectorToCaseConnector,
} from '../helpers';

export function initPatchCaseConfigure({
  caseConfigureService,
  caseService,
  router,
  logger,
}: RouteDeps) {
  router.patch(
    {
      path: CASE_CONFIGURE_URL,
      validate: {
        body: escapeHatch,
      },
    },
    async (context, request, response) => {
      try {
        let error = null;
        const client = context.core.savedObjects.client;
        const query = pipe(
          CasesConfigurePatchRt.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const myCaseConfigure = await caseConfigureService.find({ client });
        const { version, connector, ...queryWithoutVersion } = query;
        if (myCaseConfigure.saved_objects.length === 0) {
          throw Boom.conflict(
            'You can not patch this configuration since you did not created first with a post.'
          );
        }

        if (version !== myCaseConfigure.saved_objects[0].version) {
          throw Boom.conflict(
            'This configuration has been updated. Please refresh before saving additional updates.'
          );
        }

        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { username, full_name, email } = await caseService.getUser({ request });

        const updateDate = new Date().toISOString();

        let mappings: ConnectorMappingsAttributes[] = [];
        if (connector != null) {
          if (!context.cases) {
            throw Boom.badRequest('RouteHandlerContext is not registered for cases');
          }
          const casesClient = context.cases.getCasesClient();
          const actionsClient = context.actions?.getActionsClient();
          if (actionsClient == null) {
            throw Boom.notFound('Action client have not been found');
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
        const patch = await caseConfigureService.patch({
          client,
          caseConfigureId: myCaseConfigure.saved_objects[0].id,
          updatedAttributes: {
            ...queryWithoutVersion,
            ...(connector != null
              ? { connector: transformCaseConnectorToEsConnector(connector) }
              : {}),
            updated_at: updateDate,
            updated_by: { email, full_name, username },
          },
        });
        return response.ok({
          body: CaseConfigureResponseRt.encode({
            ...myCaseConfigure.saved_objects[0].attributes,
            ...patch.attributes,
            connector: transformESConnectorToCaseConnector(
              patch.attributes.connector ?? myCaseConfigure.saved_objects[0].attributes.connector
            ),
            mappings,
            version: patch.version ?? '',
            error,
          }),
        });
      } catch (error) {
        logger.error(`Failed to get patch configure in route: ${error}`);
        return response.customError(wrapError(error));
      }
    }
  );
}
