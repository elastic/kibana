/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import type { DataStream } from '@kbn/data-stream';

import { RESULTS_ROUTE_PATH, INTERNAL_API_VERSION } from '../../../common/constants';
import { buildResponse } from '../../lib/build_response';
import { buildRouteValidation } from '../../schemas/common';
import { ResultBody } from '../../schemas/result';
import { API_DEFAULT_ERROR_MESSAGE } from '../../translations';
import { createDocumentFromResult } from './parser';

export const postResultsRoute = (router: IRouter, logger: Logger, dataStream: DataStream) => {
  router.versioned
    .post({
      path: RESULTS_ROUTE_PATH,
      access: 'internal',
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: {
          request: {
            body: buildRouteValidation(ResultBody),
          },
        },
      },
      async (context, request, response) => {
        const resp = buildResponse(response);

        try {
          const document = createDocumentFromResult(request.body);
          const esClient = (await context.core).elasticsearch.client.asInternalUser;
          const outcome = await esClient.index({
            index: dataStream.getName(),
            body: document,
          });

          return response.ok({ body: { outcome: outcome.result } });
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
