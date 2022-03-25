/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from 'src/core/server';
import { SearchRequest, QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { QueryDslBoolQuery } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { schema as rt, TypeOf } from '@kbn/config-schema';
import type { SortOrder } from '@elastic/elasticsearch/lib/api/types';
import { transformError } from '@kbn/securitysolution-es-utils';
import { getLatestCycleIds } from './get_latest_cycle_ids';

import { CSP_KUBEBEAT_INDEX_PATTERN, FINDINGS_ROUTE_PATH } from '../../../common/constants';
import { CspAppContext } from '../../plugin';
import { CspRouter } from '../../types';

type FindingsQuerySchema = TypeOf<typeof findingsInputSchema>;

export const DEFAULT_FINDINGS_PER_PAGE = 20;

export interface FindingsOptions {
  size: number;
  from?: number;
  page?: number;
  sortField?: string;
  sortOrder?: SortOrder;
  fields?: string[];
}

const getPointerForFirstDoc = (page: number, perPage: number): number =>
  page <= 1 ? 0 : page * perPage - perPage;

const getSort = (sortField: string | undefined, sortOrder: string) =>
  sortField
    ? { sort: [{ [sortField]: sortOrder }] }
    : { sort: [{ '@timestamp': { order: sortOrder } }] };

const getSearchFields = (fields: string | undefined) =>
  fields ? { _source: fields.split(',') } : {};

const getFindingsEsQuery = (
  query: QueryDslQueryContainer,
  options: FindingsOptions
): SearchRequest => {
  return {
    index: CSP_KUBEBEAT_INDEX_PATTERN,
    query,
    ...options,
  };
};

const buildLatestCycleFilter = (
  filter: QueryDslQueryContainer[],
  latestCycleIds?: string[]
): QueryDslQueryContainer[] => {
  if (!!latestCycleIds) {
    filter.push({
      terms: { 'cycle_id.keyword': latestCycleIds },
    });
  }
  return filter;
};

const convertKqueryToElasticsearchQuery = (
  kquery: string | undefined,
  logger: Logger
): QueryDslQueryContainer[] => {
  let dslFilterQuery: QueryDslBoolQuery['filter'];
  try {
    dslFilterQuery = kquery ? toElasticsearchQuery(fromKueryExpression(kquery)) : [];
    if (!Array.isArray(dslFilterQuery)) {
      dslFilterQuery = [dslFilterQuery];
    }
  } catch (err) {
    logger.warn(`Invalid kuery syntax for the filter (${kquery}) error: ${err.message}`);
    throw err;
  }
  return dslFilterQuery;
};

const buildQueryRequest = (
  kquery: string | undefined,
  latestCycleIds: string[] | undefined,
  logger: Logger
): QueryDslQueryContainer => {
  const kqueryFilter = convertKqueryToElasticsearchQuery(kquery, logger);
  const filter = buildLatestCycleFilter(kqueryFilter, latestCycleIds);
  const query = {
    bool: {
      filter,
    },
  };
  return query;
};

const buildOptionsRequest = (queryParams: FindingsQuerySchema): FindingsOptions => ({
  size: queryParams.per_page,
  from: getPointerForFirstDoc(queryParams.page, queryParams.per_page),
  ...getSort(queryParams.sort_field, queryParams.sort_order),
  ...getSearchFields(queryParams.fields),
});

export const defineFindingsIndexRoute = (router: CspRouter, cspContext: CspAppContext): void =>
  router.get(
    {
      path: FINDINGS_ROUTE_PATH,
      validate: { query: findingsInputSchema },
    },
    async (context, request, response) => {
      if (!context.fleet.authz.fleet.all) {
        return response.forbidden();
      }

      try {
        const esClient = context.core.elasticsearch.client.asCurrentUser;
        const options = buildOptionsRequest(request.query);

        const latestCycleIds =
          request.query.latest_cycle === true
            ? await getLatestCycleIds(esClient, cspContext.logger)
            : undefined;

        if (request.query.latest_cycle === true && latestCycleIds === undefined) {
          return response.ok({ body: [] });
        }

        const query = buildQueryRequest(request.query.kquery, latestCycleIds, cspContext.logger);
        const esQuery = getFindingsEsQuery(query, options);

        const findings = await esClient.search(esQuery);
        const hits = findings.hits.hits;

        return response.ok({ body: hits });
      } catch (err) {
        const error = transformError(err);
        cspContext.logger.error(`Failed to fetch Findings ${error.message}`);
        return response.customError({
          body: { message: error.message },
          statusCode: error.statusCode,
        });
      }
    }
  );

export const findingsInputSchema = rt.object({
  /**
   * The page of objects to return
   */
  page: rt.number({ defaultValue: 1, min: 1 }),
  /**
   * The number of objects to include in each page
   */
  per_page: rt.number({ defaultValue: DEFAULT_FINDINGS_PER_PAGE, min: 0 }),
  /**
   * Boolean flag to indicate for receiving only the latest findings
   */
  latest_cycle: rt.maybe(rt.boolean()),
  /**
   * The field to use for sorting the found objects.
   */
  sort_field: rt.maybe(rt.string()),
  /**
   * The order to sort by
   */
  sort_order: rt.oneOf([rt.literal('asc'), rt.literal('desc')], { defaultValue: 'desc' }),
  /**
   * The fields in the entity to return in the response
   */
  fields: rt.maybe(rt.string()),
  /**
   * kql query
   */
  kquery: rt.maybe(rt.string()),
});
