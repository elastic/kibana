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
import type { Pagination } from '@elastic/eui';
import { useKibana } from '../../../common/hooks/use_kibana';
import { showErrorToast } from '../latest_findings/use_latest_findings';
import type { FindingsBaseEsQuery, FindingsQueryResult } from '../types';

// Maximum number of grouped findings, default limit in elasticsearch is set to 65,536 (ref: https://www.elastic.co/guide/en/elasticsearch/reference/current/search-settings.html#search-settings-max-buckets)
const MAX_BUCKETS = 60 * 1000;

interface UseResourceFindingsOptions extends FindingsBaseEsQuery {
  from: NonNullable<estypes.SearchRequest['from']>;
  size: NonNullable<estypes.SearchRequest['size']>;
}

export interface FindingsByResourceQuery {
  pageIndex: Pagination['pageIndex'];
  pageSize: Pagination['pageSize'];
}

type FindingsAggRequest = IKibanaSearchRequest<estypes.SearchRequest>;
type FindingsAggResponse = IKibanaSearchResponse<
  estypes.SearchResponse<{}, FindingsByResourceAggs>
>;

export type CspFindingsByResourceResult = FindingsQueryResult<
  ReturnType<typeof useFindingsByResource>['data'],
  unknown
>;

interface FindingsByResourceAggs {
  resource_total: estypes.AggregationsCardinalityAggregate;
  resources: estypes.AggregationsMultiBucketAggregateBase<FindingsAggBucket>;
}

interface FindingsAggBucket extends estypes.AggregationsStringRareTermsBucketKeys {
  failed_findings: estypes.AggregationsMultiBucketBase;
  name: estypes.AggregationsMultiBucketAggregateBase<estypes.AggregationsStringTermsBucketKeys>;
  subtype: estypes.AggregationsMultiBucketAggregateBase<estypes.AggregationsStringTermsBucketKeys>;
  cluster_id: estypes.AggregationsMultiBucketAggregateBase<estypes.AggregationsStringTermsBucketKeys>;
  cis_sections: estypes.AggregationsMultiBucketAggregateBase<estypes.AggregationsStringRareTermsBucketKeys>;
}

export const getFindingsByResourceAggQuery = ({
  index,
  query,
  from,
  size,
}: UseResourceFindingsOptions): estypes.SearchRequest => ({
  index,
  body: {
    query,
    size: 0,
    aggs: {
      resource_total: { cardinality: { field: 'resource.id' } },
      resources: {
        terms: { field: 'resource.id', size: MAX_BUCKETS },
        aggs: {
          name: {
            terms: { field: 'resource.name', size: 1 },
          },
          subtype: {
            terms: { field: 'resource.sub_type', size: 1 },
          },
          cis_sections: {
            terms: { field: 'rule.section.keyword' },
          },
          failed_findings: {
            filter: { term: { 'result.evaluation.keyword': 'failed' } },
          },
          cluster_id: {
            terms: { field: 'cluster_id.keyword', size: 1 },
          },
          sort_failed_findings: {
            bucket_sort: {
              from,
              size,
              sort: [
                {
                  'failed_findings>_count': { order: 'desc' },
                  _count: { order: 'desc' },
                  _key: { order: 'asc' },
                },
              ],
            },
          },
        },
      },
    },
  },
});

export const useFindingsByResource = ({ index, query, from, size }: UseResourceFindingsOptions) => {
  const {
    data,
    notifications: { toasts },
  } = useKibana().services;

  return useQuery(
    ['csp_findings_resource', { index, query, size, from }],
    () =>
      lastValueFrom(
        data.search.search<FindingsAggRequest, FindingsAggResponse>({
          params: getFindingsByResourceAggQuery({ index, query, from, size }),
        })
      ).then(({ rawResponse: { aggregations } }) => {
        if (!aggregations) throw new Error('expected aggregations to be defined');

        if (!Array.isArray(aggregations.resources.buckets))
          throw new Error('expected resources buckets to be an array');

        return {
          page: aggregations.resources.buckets.map(createFindingsByResource),
          total: aggregations.resource_total.value,
        };
      }),
    {
      keepPreviousData: true,
      onError: (err) => showErrorToast(toasts, err),
    }
  );
};

const createFindingsByResource = (resource: FindingsAggBucket) => {
  if (
    !Array.isArray(resource.cis_sections.buckets) ||
    !Array.isArray(resource.name.buckets) ||
    !Array.isArray(resource.subtype.buckets) ||
    !Array.isArray(resource.cluster_id.buckets) ||
    !resource.cis_sections.buckets.length ||
    !resource.name.buckets.length ||
    !resource.subtype.buckets.length ||
    !resource.cluster_id.buckets.length
  )
    throw new Error('expected buckets to be an array');

  return {
    resource_id: resource.key,
    resource_name: resource.name.buckets[0].key,
    resource_subtype: resource.subtype.buckets[0].key,
    cluster_id: resource.cluster_id.buckets[0].key,
    cis_sections: resource.cis_sections.buckets.map((v) => v.key),
    failed_findings: {
      count: resource.failed_findings.doc_count,
      normalized:
        resource.doc_count > 0 ? resource.failed_findings.doc_count / resource.doc_count : 0,
      total_findings: resource.doc_count,
    },
  };
};
