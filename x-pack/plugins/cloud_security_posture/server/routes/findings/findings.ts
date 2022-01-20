/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchRequest, QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

import { schema as rt, TypeOf } from '@kbn/config-schema';
import type { ElasticsearchClient } from 'src/core/server';
import type { IRouter, Logger } from 'src/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { getLatestCycleIds } from './get_latest_cycle_ids';
import { CSP_KUBEBEAT_INDEX_NAME, FINDINGS_ROUTE_PATH } from '../../../common/constants';
export const DEFAULT_FINDINGS_PER_PAGE = 20;
type FindingsQuerySchema = TypeOf<typeof schema>;

const buildQueryFilter = async (
  esClient: ElasticsearchClient,
  queryParams: FindingsQuerySchema
): Promise<QueryDslQueryContainer> => {
  if (queryParams.latest_cycle) {
    const latestCycleIds = await getLatestCycleIds(esClient);
    if (!!latestCycleIds) {
      const filter = latestCycleIds.map((latestCycleId) => ({
        term: { 'run_id.keyword': latestCycleId },
      }));

      return {
        bool: { filter },
      };
    }
  }
  return {
    match_all: {},
  };
};

const getFindingsEsQuery = async (
  esClient: ElasticsearchClient,
  queryParams: FindingsQuerySchema
): Promise<SearchRequest> => {
  const query = await buildQueryFilter(esClient, queryParams);
  return {
    index: CSP_KUBEBEAT_INDEX_NAME,
    query,
    size: queryParams.per_page,
    from:
      queryParams.page <= 1
        ? 0
        : queryParams.page * queryParams.per_page - queryParams.per_page + 1,
  };
};

export const defineFindingsIndexRoute = (router: IRouter, logger: Logger): void =>
  router.get(
    {
      path: FINDINGS_ROUTE_PATH,
      validate: { query: schema },
    },
    async (context, request, response) => {
      try {
        const esClient = context.core.elasticsearch.client.asCurrentUser;
        const { query } = request;
        const esQuery = await getFindingsEsQuery(esClient, query);
        const findings = await esClient.search(esQuery);
        const hits = findings.body.hits.hits;
        return response.ok({ body: hits });
      } catch (err) {
        const error = transformError(err);
        return response.customError({
          body: { message: error.message },
          statusCode: error.statusCode,
        });
      }
    }
  );

const schema = rt.object({
  latest_cycle: rt.maybe(rt.boolean()),
  page: rt.number({ defaultValue: 1, min: 0 }), // TODO: research for pagination best practice
  per_page: rt.number({ defaultValue: DEFAULT_FINDINGS_PER_PAGE, min: 0 }),
});
