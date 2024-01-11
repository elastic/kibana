/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import { lastValueFrom } from 'rxjs';
import type { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/data-plugin/common';
import {
  SearchRequest,
  SearchResponse,
  AggregationsCardinalityAggregate,
  AggregationsMultiBucketAggregateBase,
  AggregationsSingleBucketAggregateBase,
  AggregationsStringRareTermsBucketKeys,
  AggregationsStringTermsBucketKeys,
  SortOrder,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  LATEST_VULNERABILITIES_INDEX_PATTERN,
  VULNERABILITIES_SEVERITY,
} from '../../../../common/constants';

import { MAX_FINDINGS_TO_LOAD } from '../../../common/constants';
import { useKibana } from '../../../common/hooks/use_kibana';
import { showErrorToast } from '../../../common/utils/show_error_toast';
import { FindingsBaseEsQuery } from '../../../common/types';

type LatestFindingsRequest = IKibanaSearchRequest<SearchRequest>;
type LatestFindingsResponse = IKibanaSearchResponse<SearchResponse<any, VulnerabilitiesAggs>>;

interface VulnerabilitiesAggs {
  count: AggregationsMultiBucketAggregateBase<AggregationsStringRareTermsBucketKeys>;
  total: AggregationsCardinalityAggregate;
  resources: AggregationsMultiBucketAggregateBase<FindingsAggBucket>;
}

interface FindingsAggBucket extends AggregationsStringRareTermsBucketKeys {
  name: AggregationsMultiBucketAggregateBase<AggregationsStringTermsBucketKeys>;
  region: AggregationsMultiBucketAggregateBase<AggregationsStringTermsBucketKeys>;
  critical: AggregationsSingleBucketAggregateBase;
  high: AggregationsSingleBucketAggregateBase;
  medium: AggregationsSingleBucketAggregateBase;
  low: AggregationsSingleBucketAggregateBase;
}

interface VulnerabilitiesQuery extends FindingsBaseEsQuery {
  sortOrder: SortOrder;
  enabled: boolean;
  pageIndex: number;
  pageSize: number;
}

export const getQuery = ({
  query,
  sortOrder = 'desc',
  pageIndex,
  pageSize,
}: VulnerabilitiesQuery) => ({
  index: LATEST_VULNERABILITIES_INDEX_PATTERN,
  query,
  aggs: {
    total: { cardinality: { field: 'resource.id' } },
    resources: {
      terms: {
        field: 'resource.id',
        size: MAX_FINDINGS_TO_LOAD * 3,
        // in case there are more resources then size, ensuring resources with more vulnerabilities
        // will be included first, and then vulnerabilities with critical and high severity
        order: [{ _count: sortOrder }, { critical: 'desc' }, { high: 'desc' }, { medium: 'desc' }],
      },
      aggs: {
        vulnerabilitiesCountBucketSort: {
          bucket_sort: {
            sort: [{ _count: { order: sortOrder } }],
            from: pageIndex * pageSize,
            size: pageSize,
          },
        },
        name: {
          terms: { field: 'resource.name', size: 1 },
        },
        region: {
          terms: { field: 'cloud.region', size: 1 },
        },
        critical: {
          filter: {
            term: {
              'vulnerability.severity': { value: VULNERABILITIES_SEVERITY.CRITICAL },
            },
          },
        },
        high: {
          filter: {
            term: {
              'vulnerability.severity': { value: VULNERABILITIES_SEVERITY.HIGH },
            },
          },
        },
        medium: {
          filter: {
            term: {
              'vulnerability.severity': { value: VULNERABILITIES_SEVERITY.MEDIUM },
            },
          },
        },
        low: {
          filter: {
            term: { 'vulnerability.severity': { value: VULNERABILITIES_SEVERITY.LOW } },
          },
        },
      },
    },
  },
  size: 0,
});
const getFirstKey = (
  buckets: AggregationsMultiBucketAggregateBase<AggregationsStringTermsBucketKeys>['buckets']
) => {
  return !!Array.isArray(buckets) && !!buckets.length ? (buckets[0].key as string) : '';
};
const createVulnerabilitiesByResource = (resource: FindingsAggBucket) => ({
  resource: {
    id: resource.key,
    name: getFirstKey(resource.name.buckets),
  },
  cloud: {
    region: getFirstKey(resource.region.buckets),
  },
  vulnerabilities_count: resource.doc_count,
  severity_map: {
    critical: resource.critical.doc_count,
    high: resource.high.doc_count,
    medium: resource.medium.doc_count,
    low: resource.low.doc_count,
  },
});

export const useLatestVulnerabilitiesByResource = (options: VulnerabilitiesQuery) => {
  const {
    data,
    notifications: { toasts },
  } = useKibana().services;
  return useQuery(
    [LATEST_VULNERABILITIES_INDEX_PATTERN, 'resource', options],
    async () => {
      const {
        rawResponse: { hits, aggregations },
      } = await lastValueFrom(
        data.search.search<LatestFindingsRequest, LatestFindingsResponse>({
          params: getQuery(options),
        })
      );

      if (!aggregations) throw new Error('Failed to aggregate by resource');

      if (!Array.isArray(aggregations.resources.buckets))
        throw new Error('Failed to group by, missing resource id');

      return {
        page: aggregations.resources.buckets.map(createVulnerabilitiesByResource),
        total: aggregations.total.value,
        total_vulnerabilities: hits.total as number,
      };
    },
    {
      staleTime: 5000,
      keepPreviousData: true,
      enabled: options.enabled,
      onError: (err: Error) => showErrorToast(toasts, err),
    }
  );
};
