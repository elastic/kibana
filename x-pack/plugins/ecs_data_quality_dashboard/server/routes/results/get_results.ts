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
import type { ResultDocument } from '../../schemas/result';
import { API_DEFAULT_ERROR_MESSAGE } from '../../translations';
import type { DataQualityDashboardRequestHandlerContext } from '../../types';
import { API_RESULTS_INDEX_NOT_AVAILABLE } from './translations';
import { checkIndicesPrivileges } from './privileges';

export const getQuery = (indexName: string[]) => ({
  size: 0,
  query: { bool: { filter: [{ terms: { indexName } }] } },
  aggs: {
    latest: {
      terms: { field: 'indexName', size: 10000 }, // big enough to get all indexNames, but under `index.max_terms_count` (default 65536)
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
      options: { tags: ['access:securitySolution'] },
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: { request: { query: buildRouteValidation(GetResultQuery) } },
      },
      async (context, request, response) => {
        const services = await context.resolve(['core', 'dataQualityDashboard']);
        const resp = buildResponse(response);

        let index: string;
        try {
          index = await services.dataQualityDashboard.getResultsIndexName();
        } catch (err) {
          logger.error(`[GET results] Error retrieving results index name: ${err.message}`);
          return resp.error({
            body: `${API_RESULTS_INDEX_NOT_AVAILABLE}: ${err.message}`,
            statusCode: 503,
          });
        }

        try {
          const { client } = services.core.elasticsearch;
          const { pattern } = request.query;

          // Discover all indices for the pattern using internal user
          const indicesResponse = await client.asInternalUser.indices.get({
            index: pattern,
            features: 'aliases', // omit 'settings' and 'mappings' to reduce response size
          });

          // map data streams to their backing indices and collect indices to authorize
          const indicesToAuthorize: string[] = [];
          const dataStreamIndices: Record<string, string[]> = {};
          Object.entries(indicesResponse).forEach(([indexName, { data_stream: dataStream }]) => {
            if (dataStream) {
              if (!dataStreamIndices[dataStream]) {
                dataStreamIndices[dataStream] = [];
              }
              dataStreamIndices[dataStream].push(indexName);
            } else {
              indicesToAuthorize.push(indexName);
            }
          });
          indicesToAuthorize.push(...Object.keys(dataStreamIndices));
          if (indicesToAuthorize.length === 0) {
            return response.ok({ body: [] });
          }

          // check privileges for indices or data streams
          const hasIndexPrivileges = await checkIndicesPrivileges({
            client,
            indices: indicesToAuthorize,
          });

          // filter out unauthorized indices, and expand data streams backing indices
          const authorizedIndexNames = Object.entries(hasIndexPrivileges).reduce<string[]>(
            (acc, [indexName, authorized]) => {
              if (authorized) {
                if (dataStreamIndices[indexName]) {
                  acc.push(...dataStreamIndices[indexName]);
                } else {
                  acc.push(indexName);
                }
              }
              return acc;
            },
            []
          );
          if (authorizedIndexNames.length === 0) {
            return response.ok({ body: [] });
          }

          // Get the latest result for each indexName
          const query = { index, ...getQuery(authorizedIndexNames) };
          const { aggregations } = await client.asInternalUser.search<
            ResultDocument,
            Record<string, { buckets: LatestAggResponseBucket[] }>
          >(query);

          const results: ResultDocument[] =
            aggregations?.latest?.buckets.map((bucket) => bucket.latest_doc.hits.hits[0]._source) ??
            [];

          return response.ok({ body: results });
        } catch (err) {
          logger.error(err.message);

          return resp.error({
            body: err.message ?? API_DEFAULT_ERROR_MESSAGE,
            statusCode: err.statusCode ?? 500,
          });
        }
      }
    );
};
