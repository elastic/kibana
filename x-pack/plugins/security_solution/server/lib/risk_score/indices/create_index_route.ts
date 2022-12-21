/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import type { Logger } from '@kbn/core/server';

import { transformError } from '@kbn/securitysolution-es-utils';
import { RISK_SCORE_CREATE_INDEX } from '../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../types';
import { createEsIndexBodySchema, createIndex } from './lib/create_index';

export const createEsIndexRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.put(
    {
      path: RISK_SCORE_CREATE_INDEX,
      validate: { body: createEsIndexBodySchema },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const { client } = (await context.core).elasticsearch;
      const esClient = client.asCurrentUser;
      const options = request.body;

      try {
        const result = await createIndex({
          esClient,
          logger,
          options,
        });
        const error = result[options.index].error;

        if (error != null) {
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        } else {
          return response.ok({ body: options });
        }
      } catch (e) {
        const error = transformError(e);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
