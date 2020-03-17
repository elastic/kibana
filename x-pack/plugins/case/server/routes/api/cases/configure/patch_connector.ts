/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import Boom from 'boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import { ActionResult } from '../../../../../../actions/common';
import { CasesConnectorConfigurationRT, throwErrors } from '../../../../../common/api';
import { RouteDeps } from '../../types';
import { wrapError, escapeHatch } from '../../utils';

export function initCaseConfigurePatchActionConnector({ caseService, router }: RouteDeps) {
  router.patch(
    {
      path: '/api/cases/configure/connectors/{connector_id}',
      validate: {
        params: schema.object({
          connector_id: schema.string(),
        }),
        body: escapeHatch,
      },
    },
    async (context, request, response) => {
      try {
        const query = pipe(
          CasesConnectorConfigurationRT.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const client = context.core.savedObjects.client;
        const { connector_id: connectorId } = request.params;
        const { cases_configuration: casesConfiguration } = query;

        const normalizedMapping = casesConfiguration.mapping.map(m => ({
          source: m.source,
          target: m.target,
          actionType: m.action_type,
        }));

        const action = await client.get<ActionResult>('action', connectorId);

        const { config } = action.attributes;
        const res = await client.update('action', connectorId, {
          config: {
            ...config,
            casesConfiguration: { ...casesConfiguration, mapping: normalizedMapping },
          },
        });

        return response.ok({
          body: CasesConnectorConfigurationRT.encode({
            cases_configuration:
              res.attributes.config?.casesConfiguration ??
              action.attributes.config.casesConfiguration,
          }),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
