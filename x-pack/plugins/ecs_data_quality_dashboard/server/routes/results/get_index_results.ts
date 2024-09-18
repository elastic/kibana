/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';

import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { INTERNAL_API_VERSION, GET_INDEX_RESULTS } from '../../../common/constants';
import { buildResponse } from '../../lib/build_response';
import { buildRouteValidation } from '../../schemas/common';
import type { ResultDocument } from '../../schemas/result';
import { GetIndexResultsQuery, GetIndexResultsParams } from '../../schemas/result';
import type { DataQualityDashboardRequestHandlerContext } from '../../types';
import { API_RESULTS_INDEX_NOT_AVAILABLE } from './translations';
import { API_DEFAULT_ERROR_MESSAGE } from '../../translations';
import { getAuthorizedIndexNames } from '../../helpers/get_authorized_index_names';
import { getHitsTotal } from '../../helpers/get_hits_total';

interface GetQuery {
  indexNames: string[];
  size?: number;
  from?: number;
  outcome?: 'pass' | 'fail';
  startDate?: string;
  endDate?: string;
}

export const getQuery = ({
  indexNames,
  size,
  from,
  outcome,
  startDate,
  endDate,
}: GetQuery): SearchRequest => {
  const filters = [];

  if (outcome !== undefined) {
    const incompatibleFieldCountValueFilter = outcome === 'pass' ? { lt: 1 } : { gt: 0 };
    filters.push({
      range: {
        incompatibleFieldCount: incompatibleFieldCountValueFilter,
      },
    });
  }

  if (startDate || endDate) {
    const startDateValueFilter = startDate && { gte: startDate };
    const endDateValueFilter = endDate && { lte: endDate };
    filters.push({
      range: {
        '@timestamp': {
          ...startDateValueFilter,
          ...endDateValueFilter,
        },
      },
    });
  }

  return {
    query: {
      bool: {
        filter: [
          {
            terms: {
              indexName: indexNames,
            },
          },
          ...filters,
        ],
      },
    },
    sort: [{ '@timestamp': 'desc' }],
    ...(size != null && { size }),
    ...(from != null && { from }),
  };
};

export const getIndexResultsRoute = (
  router: IRouter<DataQualityDashboardRequestHandlerContext>,
  logger: Logger
) => {
  router.versioned
    .get({
      path: GET_INDEX_RESULTS,
      access: 'internal',
      options: { tags: ['access:securitySolution'] },
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: {
          request: {
            params: buildRouteValidation(GetIndexResultsParams),
            query: buildRouteValidation(GetIndexResultsQuery),
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
            return response.ok({ body: { data: [], total: 0 } });
          }

          const { from, size, startDate, endDate, outcome } = request.query;
          // Get all results for all index names
          const query = {
            index,
            ...getQuery({
              indexNames: authorizedIndexNames,
              from,
              size,
              startDate,
              endDate,
              outcome,
            }),
          };
          const { hits } = await client.asInternalUser.search<ResultDocument>(query);

          const resultsWithUndefined = hits.hits.map((doc) => doc._source) ?? [];

          const resultsWithoutUndefined = resultsWithUndefined.filter((r) => r);

          return response.ok({
            body: { data: resultsWithoutUndefined, total: getHitsTotal(hits) },
          });
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
