/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';

import { RISK_SCORE_DELETE_INDICES } from '../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../types';
import { deleteEsIndices } from './lib/delete_indices';

const bodySchema = schema.object({
  indices: schema.arrayOf(schema.string()),
});

export const deleteEsIndicesRoute = (router: SecuritySolutionPluginRouter) => {
  router.post(
    {
      path: RISK_SCORE_DELETE_INDICES,
      validate: { body: bodySchema },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      const { client } = (await context.core).elasticsearch;
      const { indices } = request.body;

      try {
        await deleteEsIndices({ client, indices });
        return response.ok({ body: { deleted: indices } });
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
