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
import { number } from 'io-ts';
import { CspFinding } from '../../../../../common/schemas/csp_finding';
import { getAggregationCount, getFindingsCountAggQuery } from '../../utils/utils';
import { useKibana } from '../../../../common/hooks/use_kibana';
import { showErrorToast } from '../../latest_findings/use_latest_findings';
import type { FindingsBaseEsQuery, Sort } from '../../types';
import { CSP_LATEST_FINDINGS_DATA_VIEW } from '../../../../../common/constants';
import { MAX_FINDINGS_TO_LOAD } from '../../../../common/constants';

interface UseResourceFindingsOptions extends FindingsBaseEsQuery {
  resourceId: string;
  sort: Sort<CspFinding>;
  enabled: boolean;
}

export interface ResourceFindingsQuery {
  pageIndex: Pagination['pageIndex'];
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
  sort,
}: UseResourceFindingsOptions): estypes.SearchRequest => ({
  index: CSP_LATEST_FINDINGS_DATA_VIEW,
  body: {
    size: MAX_FINDINGS_TO_LOAD,
    query: {
      ...query,
      bool: {
        ...query?.bool,
        filter: [...(query?.bool?.filter || []), { term: { 'resource.id': resourceId } }],
      },
    },
    sort: [{ [sort.field]: sort.direction }],
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

  const params = { ...options };

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
      select: ({ rawResponse: { hits, aggregations } }: ResourceFindingsResponse) => {
        if (!aggregations) throw new Error('expected aggregations to exists');
        assertNonBucketsArray(aggregations.count.buckets);
        assertNonBucketsArray(aggregations.clusterId.buckets);
        assertNonBucketsArray(aggregations.resourceSubType.buckets);
        assertNonBucketsArray(aggregations.resourceName.buckets);

        return {
          page: hits.hits.map((hit) => hit._source!),
          total: number.is(hits.total) ? hits.total : 0,
          count: getAggregationCount(aggregations.count.buckets),
          clusterId: getFirstBucketKey(aggregations.clusterId.buckets),
          resourceSubType: getFirstBucketKey(aggregations.resourceSubType.buckets),
          resourceName: getFirstBucketKey(aggregations.resourceName.buckets),
        };
      },
      onError: (err: Error) => showErrorToast(toasts, err),
    }
  );
};

function assertNonBucketsArray<T>(arr: unknown): asserts arr is T[] {
  if (!Array.isArray(arr)) {
    throw new Error('expected buckets to be an array');
  }
}

const getFirstBucketKey = (buckets: estypes.AggregationsStringRareTermsBucketKeys[]): string =>
  buckets[0]?.key ?? '';
