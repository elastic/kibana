/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import { lastValueFrom } from 'rxjs';
import { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/data-plugin/common';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Pagination } from '@elastic/eui';
import { useContext } from 'react';
import { number } from 'io-ts';
import { CspFinding } from '../../../../../common/schemas/csp_finding';
import { getAggregationCount, getFindingsCountAggQuery } from '../../utils/utils';
import { FindingsEsPitContext } from '../../es_pit/findings_es_pit_context';
import { FINDINGS_REFETCH_INTERVAL_MS } from '../../constants';
import { useKibana } from '../../../../common/hooks/use_kibana';
import { showErrorToast } from '../../latest_findings/use_latest_findings';
import type { FindingsBaseEsQuery, Sort } from '../../types';

interface UseResourceFindingsOptions extends FindingsBaseEsQuery {
  resourceId: string;
  from: NonNullable<NonNullable<estypes.SearchRequest['body']>['from']>;
  size: NonNullable<NonNullable<estypes.SearchRequest['body']>['size']>;
  sort: Sort<CspFinding>;
  enabled: boolean;
}

export interface ResourceFindingsQuery {
  pageIndex: Pagination['pageIndex'];
  pageSize: Pagination['pageSize'];
  sort: Sort<CspFinding>;
}

type ResourceFindingsRequest = IKibanaSearchRequest<estypes.SearchRequest>;
type ResourceFindingsResponse = IKibanaSearchResponse<
  estypes.SearchResponse<CspFinding, ResourceFindingsResponseAggs>
>;

export type ResourceFindingsResponseAggs = Record<
  'count' | 'clusterId' | 'resourceSubType' | 'resourceName',
  estypes.AggregationsMultiBucketAggregateBase<estypes.AggregationsStringRareTermsBucketKeys>
>;

const getResourceFindingsQuery = ({
  query,
  resourceId,
  from,
  size,
  pitId,
  sort,
}: UseResourceFindingsOptions & { pitId: string }): estypes.SearchRequest => ({
  body: {
    from,
    size,
    query: {
      ...query,
      bool: {
        ...query?.bool,
        filter: [...(query?.bool?.filter || []), { term: { 'resource.id': resourceId } }],
      },
    },
    sort: [{ [sort.field]: sort.direction }],
    pit: { id: pitId },
    aggs: {
      ...getFindingsCountAggQuery(),
      clusterId: {
        terms: { field: 'cluster_id' },
      },
      resourceSubType: {
        terms: { field: 'resource.sub_type' },
      },
      resourceName: {
        terms: { field: 'resource.name' },
      },
    },
  },
  ignore_unavailable: false,
});

export const useResourceFindings = (options: UseResourceFindingsOptions) => {
  const {
    data,
    notifications: { toasts },
  } = useKibana().services;

  const { pitIdRef, setPitId } = useContext(FindingsEsPitContext);
  const params = { ...options, pitId: pitIdRef.current };

  return useQuery(
    ['csp_resource_findings', { params }],
    () =>
      lastValueFrom(
        data.search.search<ResourceFindingsRequest, ResourceFindingsResponse>({
          params: getResourceFindingsQuery(params),
        })
      ),
    {
      enabled: options.enabled,
      keepPreviousData: true,
      select: ({
        rawResponse: { hits, pit_id: newPitId, aggregations },
      }: ResourceFindingsResponse) => {
        if (!aggregations) throw new Error('expected aggregations to exists');

        assertNonEmptyArray(aggregations.count.buckets);
        assertNonEmptyArray(aggregations.clusterId.buckets);
        assertNonEmptyArray(aggregations.resourceSubType.buckets);
        assertNonEmptyArray(aggregations.resourceName.buckets);

        return {
          page: hits.hits.map((hit) => hit._source!),
          total: number.is(hits.total) ? hits.total : 0,
          count: getAggregationCount(aggregations.count.buckets),
          clusterId: getFirstBucketKey(aggregations.clusterId.buckets),
          resourceSubType: getFirstBucketKey(aggregations.resourceSubType.buckets),
          resourceName: getFirstBucketKey(aggregations.resourceName.buckets),
          newPitId: newPitId!,
        };
      },
      onError: (err: Error) => showErrorToast(toasts, err),
      onSuccess: ({ newPitId }) => {
        setPitId(newPitId);
      },
      // Refetching on an interval to ensure the PIT window stays open
      refetchInterval: FINDINGS_REFETCH_INTERVAL_MS,
      refetchIntervalInBackground: true,
    }
  );
};

function assertNonEmptyArray<T>(arr: unknown): asserts arr is T[] {
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error('expected a non empty array');
  }
}

const getFirstBucketKey = (buckets: estypes.AggregationsStringRareTermsBucketKeys[]) =>
  buckets[0].key;
