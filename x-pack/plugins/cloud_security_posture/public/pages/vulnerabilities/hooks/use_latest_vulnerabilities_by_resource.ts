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
import { LATEST_VULNERABILITIES_INDEX_PATTERN } from '../../../../common/constants';
import { MAX_FINDINGS_TO_LOAD } from '../../../common/constants';
import { useKibana } from '../../../common/hooks/use_kibana';
import { showErrorToast } from '../../../common/utils/show_error_toast';
import { FindingsBaseEsQuery } from '../../../common/types';
import { getVulnerabilityFilter } from '../utils';

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
  vulnerability_severity_critical: AggregationsSingleBucketAggregateBase;
  vulnerability_severity_high: AggregationsSingleBucketAggregateBase;
  vulnerability_severity_medium: AggregationsSingleBucketAggregateBase;
  vulnerability_severity_low: AggregationsSingleBucketAggregateBase;
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
  query: {
    ...query,
    bool: {
      ...query?.bool,
      filter: [...(query?.bool?.filter || []), ...getVulnerabilityFilter()],
    },
  },
  aggs: {
    total: { cardinality: { field: 'resource.id' } },
    resources: {
      terms: {
        field: 'resource.id',
        order: {
          _count: 'desc',
        },
        size: MAX_FINDINGS_TO_LOAD,
      },
      aggs: {
        vulnerabilitiesCountBucketSort: {
          bucket_sort: {
            sort: [
              {
                _count: { order: sortOrder },
              },
            ],
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
        vulnerability_severity_critical: {
          filter: {
            bool: {
              filter: [
                {
                  bool: {
                    should: [{ term: { 'vulnerability.severity': { value: 'CRITICAL' } } }],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
        },
        vulnerability_severity_high: {
          filter: {
            bool: {
              filter: [
                {
                  bool: {
                    should: [{ term: { 'vulnerability.severity': { value: 'HIGH' } } }],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
        },
        vulnerability_severity_medium: {
          filter: {
            bool: {
              filter: [
                {
                  bool: {
                    should: [{ term: { 'vulnerability.severity': { value: 'MEDIUM' } } }],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
        },
        vulnerability_severity_low: {
          filter: {
            bool: {
              filter: [
                {
                  bool: {
                    should: [{ term: { 'vulnerability.severity': { value: 'LOW' } } }],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
        },
      },
    },
  },
  size: 0,
});
const getFirstKey = (
  buckets: AggregationsMultiBucketAggregateBase<AggregationsStringTermsBucketKeys>['buckets']
): undefined | string => {
  if (!!Array.isArray(buckets) && !!buckets.length) return buckets[0].key;
};
const createVulnerabilitiesByResource = (resource: FindingsAggBucket) => ({
  'resource.id': resource.key,
  'resource.name': getFirstKey(resource.name.buckets),
  'cloud.region': getFirstKey(resource.region.buckets),
  vulnerabilities_count: resource.doc_count,
  severity_map: {
    critical: resource.vulnerability_severity_critical.doc_count,
    high: resource.vulnerability_severity_high.doc_count,
    medium: resource.vulnerability_severity_medium.doc_count,
    low: resource.vulnerability_severity_low.doc_count,
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
