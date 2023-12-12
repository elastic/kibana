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
import { API_DEFAULT_ERROR_MESSAGE } from '../../translations';
import { createResultFromDocument } from './parser';

export const getResultsRoute = (router: IRouter, logger: Logger, dataStream: DataStream) => {
  router.versioned
    .get({
      path: RESULTS_ROUTE_PATH,
      access: 'internal',
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: {
          // request: {
          //   params: buildRouteValidation({}),
          // },
          // response: buildRouteValidation(ResultBody),
        },
      },
      async (context, request, response) => {
        const resp = buildResponse(response);

        try {
          // const esClient = (await context.core).elasticsearch.client.asInternalUser;
          // const outcome = await esClient.search({
          //   index: dataStream.getName(),
          //   body: document,
          // });

          // return response.ok({ body: { result: createResultFromDocument(outcome) } });
          return response.ok({ body: [] });
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

type IndexArray = Array<{ _indexName: string } & Record<string, unknown>>;
type IndexObject = Record<string, Record<string, unknown>>;

const indexObjectToIndexArray = (obj: IndexObject): IndexArray =>
  Object.entries(obj).map(([key, value]) => ({ ...value, _indexName: key }));

const indexArrayToIndexObject = (arr: IndexArray): IndexObject =>
  Object.fromEntries(arr.map(({ _indexName, ...value }) => [_indexName, value]));
