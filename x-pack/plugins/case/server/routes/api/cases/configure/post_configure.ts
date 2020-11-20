/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import {
  CasesConfigureRequestRt,
  CaseConfigureResponseRt,
  throwErrors,
} from '../../../../../common/api';
import { RouteDeps } from '../../types';
import { wrapError, escapeHatch } from '../../utils';
import { CASE_CONFIGURE_URL } from '../../../../../common/constants';
import {
  transformCaseConnectorToEsConnector,
  transformESConnectorToCaseConnector,
} from '../helpers';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../../../actions/server/saved_objects';

export function initPostCaseConfigure({
  caseConfigureService,
  caseService,
  connectorMappingsService,
  router,
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
        if (!context.case) {
          throw Boom.badRequest('RouteHandlerContext is not registered for cases');
        }
        const caseClient = context.case.getCaseClient();
        const actionsClient = await context.actions?.getActionsClient();
        if (actionsClient == null) {
          throw Boom.notFound('Action client have not been found');
        }
        const client = context.core.savedObjects.client;
        const query = pipe(
          CasesConfigureRequestRt.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );

        console.log('hello 111');
        const myCaseConfigure = await caseConfigureService.find({ client });
        console.log('myCaseConfigure', JSON.stringify(myCaseConfigure));
        if (myCaseConfigure.saved_objects.length > 0) {
          await Promise.all(
            myCaseConfigure.saved_objects.map((cc) =>
              caseConfigureService.delete({ client, caseConfigureId: cc.id })
            )
          );
        }
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { email, full_name, username } = await caseService.getUser({ request, response });

        const creationDate = new Date().toISOString();
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

        const myConnectorMappings = await connectorMappingsService.find({
          client,
          options: {
            hasReference: {
              type: ACTION_SAVED_OBJECT_TYPE,
              id: query.connector.id,
            },
          },
        });
        // Create connector mappings if there are none
        if (myConnectorMappings.total === 0) {
          const res = await caseClient.getFields({
            actionsClient,
            connectorId: query.connector.id,
            connectorType: query.connector.type,
          });
          await connectorMappingsService.post({
            client,
            attributes: {
              mappings: res.defaultMappings,
            },
            references: [
              {
                type: ACTION_SAVED_OBJECT_TYPE,
                name: `associated-${ACTION_SAVED_OBJECT_TYPE}`,
                id: query.connector.id,
              },
            ],
          });
        }

        return response.ok({
          body: CaseConfigureResponseRt.encode({
            ...post.attributes,
            // Reserve for future implementations
            connector: transformESConnectorToCaseConnector(post.attributes.connector),
            version: post.version ?? '',
          }),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
