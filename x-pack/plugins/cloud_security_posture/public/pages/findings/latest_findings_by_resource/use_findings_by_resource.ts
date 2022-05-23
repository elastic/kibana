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
import { FINDINGS_REFETCH_INTERVAL_MS } from '../constants';
import { useKibana } from '../../../common/hooks/use_kibana';
import { showErrorToast } from '../latest_findings/use_latest_findings';
import type { FindingsBaseEsQuery, FindingsQueryResult } from '../types';

// a large number to probably get all the buckets
const MAX_BUCKETS = 1000 * 1000;

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

interface FindingsByResourcePage {
  failed_findings: {
    count: number;
    normalized: number;
    total_findings: number;
  };
  resource_id: string;
  resource_name?: string;
  resource_subtype?: string;
  cis_sections: string[];
}

interface UseFindingsByResourceData {
  page: FindingsByResourcePage[];
  total: number;
  newPitId: string;
}

export type CspFindingsByResourceResult = FindingsQueryResult<
  UseFindingsByResourceData | undefined,
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
  cis_sections: estypes.AggregationsMultiBucketAggregateBase<estypes.AggregationsStringRareTermsBucketKeys>;
}

export const getFindingsByResourceAggQuery = ({
  query,
  from,
  size,
  pitIdRef,
}: Omit<UseResourceFindingsOptions, 'setPitId'>): estypes.SearchRequest => ({
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
    pit: { id: pitIdRef.current },
  },
  ignore_unavailable: false,
});

export const useFindingsByResource = ({
  query,
  from,
  size,
  pitIdRef,
  setPitId,
}: UseResourceFindingsOptions) => {
  const {
    data,
    notifications: { toasts },
  } = useKibana().services;

  return useQuery<UseFindingsByResourceData>(
    ['csp_findings_resource', { query, size, from, pitId: pitIdRef.current }],
    () =>
      lastValueFrom(
        data.search.search<FindingsAggRequest, FindingsAggResponse>({
          params: getFindingsByResourceAggQuery({ query, from, size, pitIdRef }),
        })
      ).then(({ rawResponse: { aggregations, pit_id: newPitId } }) => {
        if (!aggregations) throw new Error('expected aggregations to be defined');

        if (!Array.isArray(aggregations.resources.buckets))
          throw new Error('expected resources buckets to be an array');

        return {
          page: aggregations.resources.buckets.map(createFindingsByResource),
          total: aggregations.resource_total.value,
          newPitId: newPitId!,
        };
      }),
    {
      keepPreviousData: true,
      onError: (err) => showErrorToast(toasts, err),
      onSuccess: ({ newPitId }) => {
        setPitId(newPitId);
      },
      // Refetching on an interval to ensure the PIT window stays open
      refetchInterval: FINDINGS_REFETCH_INTERVAL_MS,
      refetchIntervalInBackground: true,
    }
  );
};

const createFindingsByResource = (resource: FindingsAggBucket): FindingsByResourcePage => {
  if (
    !Array.isArray(resource.cis_sections.buckets) ||
    !Array.isArray(resource.name.buckets) ||
    !Array.isArray(resource.subtype.buckets)
  )
    throw new Error('expected buckets to be an array');

  return {
    resource_id: resource.key,
    resource_name: resource.name.buckets.map((v) => v.key).at(0),
    resource_subtype: resource.subtype.buckets.map((v) => v.key).at(0),
    cis_sections: resource.cis_sections.buckets.map((v) => v.key),
    failed_findings: {
      count: resource.failed_findings.doc_count,
      normalized:
        resource.doc_count > 0 ? resource.failed_findings.doc_count / resource.doc_count : 0,
      total_findings: resource.doc_count,
    },
  };
};
