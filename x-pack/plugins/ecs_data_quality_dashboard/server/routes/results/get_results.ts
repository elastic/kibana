/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';

import { RESULTS_ROUTE_PATH, INTERNAL_API_VERSION } from '../../../common/constants';
import { buildResponse } from '../../lib/build_response';
import { buildRouteValidation } from '../../schemas/common';
import { GetResultQuery } from '../../schemas/result';
import type { Result, ResultDocument } from '../../schemas/result';
import { API_DEFAULT_ERROR_MESSAGE } from '../../translations';
import type { DataQualityDashboardRequestHandlerContext } from '../../types';
import { createResultFromDocument } from './parser';
import { API_RESULTS_INDEX_NOT_AVAILABLE } from './translations';

const getQuery = (patterns: string) => ({
  size: 0,
  query: {
    bool: { filter: [{ terms: { 'rollup.pattern': patterns.split(',') } }] },
  },
  aggs: {
    latest: {
      terms: { field: 'rollup.pattern', size: 1000000 }, // big enough to get all patterns
      aggs: { latest_doc: { top_hits: { size: 1, sort: [{ '@timestamp': { order: 'desc' } }] } } },
    },
  },
});

export interface LatestAggResponseBucket {
  key: string;
  latest_doc: { hits: { hits: Array<{ _source: ResultDocument }> } };
}

export const getResultsRoute = (
  router: IRouter<DataQualityDashboardRequestHandlerContext>,
  logger: Logger
) => {
  router.versioned
    .get({
      path: RESULTS_ROUTE_PATH,
      access: 'internal',
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: { request: { query: buildRouteValidation(GetResultQuery) } },
      },
      async (context, request, response) => {
        const { dataQualityDashboard } = await context.resolve(['core', 'dataQualityDashboard']);
        const { getResultsIndexName } = dataQualityDashboard;
        const resp = buildResponse(response);

        let index: string;
        try {
          index = await getResultsIndexName();
        } catch (err) {
          logger.error(JSON.stringify(err));
          return resp.error({
            body: `${API_RESULTS_INDEX_NOT_AVAILABLE}: ${err.message}`,
            statusCode: 503,
          });
        }

        try {
          const query = { index, ...getQuery(request.query.patterns) };
          const esClient = (await context.core).elasticsearch.client.asInternalUser;

          const { aggregations } = await esClient.search<
            ResultDocument,
            Record<string, { buckets: LatestAggResponseBucket[] }>
          >(query);

          const results: Result[] =
            aggregations?.latest?.buckets.map((bucket) =>
              createResultFromDocument(bucket.latest_doc.hits.hits[0]._source)
            ) ?? [];

          return response.ok({ body: results });
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
