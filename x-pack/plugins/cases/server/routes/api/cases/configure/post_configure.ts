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
  CasesConfigureRequestRt,
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

export function initPostCaseConfigure({
  caseConfigureService,
  caseService,
  router,
  logger,
}: RouteDeps) {
  router.post(
    {
      path: CASE_CONFIGURE_URL,
      validate: {
        body: escapeHatch,
      },
    },
    async (context, request, response) => {
      try {
        let error = null;
        if (!context.cases) {
          throw Boom.badRequest('RouteHandlerContext is not registered for cases');
        }
        const casesClient = context.cases.getCasesClient();
        const actionsClient = context.actions?.getActionsClient();
        if (actionsClient == null) {
          throw Boom.notFound('Action client not found');
        }
        const client = context.core.savedObjects.client;
        const query = pipe(
          CasesConfigureRequestRt.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const myCaseConfigure = await caseConfigureService.find({ client });
        if (myCaseConfigure.saved_objects.length > 0) {
          await Promise.all(
            myCaseConfigure.saved_objects.map((cc) =>
              caseConfigureService.delete({ client, caseConfigureId: cc.id })
            )
          );
        }
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { email, full_name, username } = await caseService.getUser({ request });

        const creationDate = new Date().toISOString();
        let mappings: ConnectorMappingsAttributes[] = [];
        try {
          mappings = await casesClient.getMappings({
            actionsClient,
            connectorId: query.connector.id,
            connectorType: query.connector.type,
          });
        } catch (e) {
          error = e.isBoom
            ? e.output.payload.message
            : `Error connecting to ${query.connector.name} instance`;
        }
        const post = await caseConfigureService.post({
          client,
          attributes: {
            ...query,
            connector: transformCaseConnectorToEsConnector(query.connector),
            created_at: creationDate,
            created_by: { email, full_name, username },
            updated_at: null,
            updated_by: null,
          },
        });

        return response.ok({
          body: CaseConfigureResponseRt.encode({
            ...post.attributes,
            // Reserve for future implementations
            connector: transformESConnectorToCaseConnector(post.attributes.connector),
            mappings,
            version: post.version ?? '',
            error,
          }),
        });
      } catch (error) {
        logger.error(`Failed to post case configure in route: ${error}`);
        return response.customError(wrapError(error));
      }
    }
  );
}
