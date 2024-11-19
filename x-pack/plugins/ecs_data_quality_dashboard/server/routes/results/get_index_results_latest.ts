/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRouter, Logger } from '@kbn/core/server';

import { INTERNAL_API_VERSION, GET_INDEX_RESULTS_LATEST } from '../../../common/constants';
import { buildResponse } from '../../lib/build_response';
import { buildRouteValidation } from '../../schemas/common';
import { GetIndexResultsLatestParams, GetIndexResultsLatestQuery } from '../../schemas/result';
import type { ResultDocument } from '../../schemas/result';
import { API_DEFAULT_ERROR_MESSAGE } from '../../translations';
import type { DataQualityDashboardRequestHandlerContext } from '../../types';
import { API_RESULTS_INDEX_NOT_AVAILABLE } from './translations';
import { getAuthorizedIndexNames } from '../../helpers/get_authorized_index_names';
import { getRangeFilteredIndices } from '../../helpers/get_range_filtered_indices';

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

export const getIndexResultsLatestRoute = (
  router: IRouter<DataQualityDashboardRequestHandlerContext>,
  logger: Logger
) => {
  router.versioned
    .get({
      path: GET_INDEX_RESULTS_LATEST,
      access: 'internal',
      options: { tags: ['access:securitySolution'] },
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: {
          request: {
            params: buildRouteValidation(GetIndexResultsLatestParams),
            query: buildRouteValidation(GetIndexResultsLatestQuery),
          },
        },
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
          const { pattern } = request.params;

          const authorizedIndexNames = await getAuthorizedIndexNames(client, pattern);

          if (authorizedIndexNames.length === 0) {
            return response.ok({ body: [] });
          }

          const { startDate, endDate } = request.query;

          let resultingIndices: string[] = [];

          if (startDate && endDate) {
            resultingIndices = resultingIndices.concat(
              await getRangeFilteredIndices({
                client,
                authorizedIndexNames,
                startDate,
                endDate,
                logger,
                pattern,
              })
            );
          } else {
            resultingIndices = authorizedIndexNames;
          }

          // Get the latest result for each indexName
          const query = { index, ...getQuery(resultingIndices) };
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
