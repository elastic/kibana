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
  CasesConfigurePatchRt,
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

export function initPatchCaseConfigure({
  caseConfigureService,
  caseService,
  connectorMappingsService,
  router,
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
        const client = context.core.savedObjects.client;
        if (!context.case) {
          throw Boom.badRequest('RouteHandlerContext is not registered for cases');
        }
        const caseClient = context.case.getCaseClient();
        const actionsClient = await context.actions?.getActionsClient();
        if (actionsClient == null) {
          throw Boom.notFound('Action client have not been found');
        }
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
        const { username, full_name, email } = await caseService.getUser({ request, response });

        const updateDate = new Date().toISOString();
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
        let theMapping;
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
          body: CaseConfigureResponseRt.encode({
            ...myCaseConfigure.saved_objects[0].attributes,
            ...patch.attributes,
            connector: transformESConnectorToCaseConnector(
              patch.attributes.connector ?? myCaseConfigure.saved_objects[0].attributes.connector
            ),
            mappings: theMapping ? theMapping.attributes.mappings : [],
            version: patch.version ?? '',
          }),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
