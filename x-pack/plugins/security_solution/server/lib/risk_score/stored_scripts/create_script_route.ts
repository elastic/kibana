/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { createStoredScriptRequestBody } from '../../../../common/api/entity_analytics/risk_score';
import { RISK_SCORE_CREATE_STORED_SCRIPT } from '../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../types';
import { createStoredScript } from './lib/create_script';

export const createStoredScriptRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.versioned
    .put({
      access: 'internal',
      path: RISK_SCORE_CREATE_STORED_SCRIPT,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      { validate: { request: { body: createStoredScriptRequestBody } }, version: '1' },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        const { client } = (await context.core).elasticsearch;
        const esClient = client.asCurrentUser;
        const options = request.body;

        try {
          const result = await createStoredScript({
            esClient,
            logger,
            options,
          });

          const error = result[options.id].error;
          if (error != null) {
            return siemResponse.error({ statusCode: error.statusCode, body: error.message });
          } else {
            return response.ok({ body: options });
          }
        } catch (e) {
          const error = transformError(e);
          return siemResponse.error({ statusCode: error.statusCode, body: error.message });
        }
      }
    );
};
