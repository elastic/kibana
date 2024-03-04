/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';

import { GET_ILM_EXPLAIN, INTERNAL_API_VERSION } from '../../common/constants';
import { fetchILMExplain } from '../lib';
import { buildResponse } from '../lib/build_response';
import { buildRouteValidation } from '../schemas/common';
import { GetILMExplainParams } from '../schemas/get_ilm_explain';
import { API_DEFAULT_ERROR_MESSAGE } from '../translations';

export const getILMExplainRoute = (router: IRouter, logger: Logger) => {
  router.versioned
    .get({
      path: GET_ILM_EXPLAIN,
      access: 'internal',
      options: { tags: ['access:securitySolution'] },
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: {
          request: {
            params: buildRouteValidation(GetILMExplainParams),
          },
        },
      },
      async (context, request, response) => {
        const resp = buildResponse(response);

        try {
          const { client } = (await context.core).elasticsearch;
          const decodedIndexName = decodeURIComponent(request.params.pattern);

          const ilmExplain = await fetchILMExplain(client, decodedIndexName);

          return response.ok({
            body: ilmExplain.indices,
          });
        } catch (err) {
          logger.error(JSON.stringify(err));

          return resp.error({
            body: err.message ?? API_DEFAULT_ERROR_MESSAGE,
            statusCode: err.statusCode ?? 500,
          });
        }
      }
    );
};
