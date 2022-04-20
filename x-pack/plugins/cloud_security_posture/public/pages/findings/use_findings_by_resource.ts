/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from 'react-query';
import { lastValueFrom } from 'rxjs';
import { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/data-plugin/common';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { useKibana } from '../../common/hooks/use_kibana';
import { showErrorToast } from './use_findings';
import type { FindingsBaseEsQuery, FindingsQueryResult, FindingsQueryStatus } from './types';

interface UseFindingsByResourceOptions extends FindingsBaseEsQuery, FindingsQueryStatus {}

type FindingsAggRequest = IKibanaSearchRequest<estypes.SearchRequest>;
type FindingsAggResponse = IKibanaSearchResponse<
  estypes.SearchResponse<{}, FindingsByResourceAggs>
>;

export type CspFindingsByResourceResult = FindingsQueryResult<
  ReturnType<typeof useFindingsByResource>['data'] | undefined,
  unknown
>;

interface FindingsByResourceAggs extends estypes.AggregationsCompositeAggregate {
  groupBy: {
    buckets: FindingsAggBucket[];
  };
}

interface FindingsAggBucket {
  doc_count: number;
  failed_findings: { doc_count: number };
  key: {
    resource_id: string;
    cluster_id: string;
    cis_section: string;
  };
}

export const getFindingsByResourceAggQuery = ({
  index,
  query,
}: Omit<UseFindingsByResourceOptions, 'enabled'>): estypes.SearchRequest => ({
  index,
  size: 0,
  body: {
    query,
    aggs: {
      groupBy: {
        composite: {
          size: 10 * 1000,
          sources: [
            { resource_id: { terms: { field: 'resource_id.keyword' } } },
            { cluster_id: { terms: { field: 'cluster_id.keyword' } } },
            { cis_section: { terms: { field: 'rule.section' } } },
          ],
        },
        aggs: {
          failed_findings: {
            filter: { term: { 'result.evaluation.keyword': 'failed' } },
          },
        },
      },
    },
  },
});

export const useFindingsByResource = ({ enabled, index, query }: UseFindingsByResourceOptions) => {
  const {
    data,
    notifications: { toasts },
  } = useKibana().services;

  return useQuery(
    ['csp_findings_resource', { index, query }],
    () =>
      lastValueFrom(
        data.search.search<FindingsAggRequest, FindingsAggResponse>({
          params: getFindingsByResourceAggQuery({ index, query }),
        })
      ),
    {
      enabled,
      select: ({ rawResponse }) => ({
        page: rawResponse.aggregations?.groupBy.buckets.map(createFindingsByResource) || [],
      }),
      onError: (err) => showErrorToast(toasts, err),
    }
  );
};

const createFindingsByResource = (bucket: FindingsAggBucket) => ({
  ...bucket.key,
  failed_findings: {
    total: bucket.failed_findings.doc_count,
    normalized: bucket.doc_count > 0 ? bucket.failed_findings.doc_count / bucket.doc_count : 0,
  },
});
