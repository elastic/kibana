/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { RISK_SCORE_DELETE_STORED_SCRIPT } from '../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../types';
import { deleteStoredScriptBodySchema, deleteStoredScript } from './lib/delete_script';

export const deleteStoredScriptRoute = (router: SecuritySolutionPluginRouter) => {
  router.delete(
    {
      path: RISK_SCORE_DELETE_STORED_SCRIPT,
      validate: { body: deleteStoredScriptBodySchema },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const { client } = (await context.core).elasticsearch;
      const options = request.body;
      try {
        await deleteStoredScript({
          client,
          options,
        });
        return response.ok({ body: options });
      } catch (err) {
        const error = transformError(err);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
