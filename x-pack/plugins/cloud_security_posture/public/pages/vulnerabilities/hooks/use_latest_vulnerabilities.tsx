/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import { lastValueFrom } from 'rxjs';
import type { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/data-plugin/common';
import { number } from 'io-ts';
import {
  SearchRequest,
  SearchResponse,
  AggregationsMultiBucketAggregateBase,
  AggregationsStringRareTermsBucketKeys,
  Sort,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { CspVulnerabilityFinding } from '../../../../common/schemas';
import { LATEST_VULNERABILITIES_INDEX_PATTERN } from '../../../../common/constants';
import { getSafeVulnerabilitiesQueryFilter } from '../../../../common/utils/get_safe_vulnerabilities_query_filter';
import { useKibana } from '../../../common/hooks/use_kibana';
import { showErrorToast } from '../../../common/utils/show_error_toast';
import { FindingsBaseEsQuery } from '../../../common/types';
type LatestFindingsRequest = IKibanaSearchRequest<SearchRequest>;
type LatestFindingsResponse = IKibanaSearchResponse<SearchResponse<any, FindingsAggs>>;

interface FindingsAggs {
  count: AggregationsMultiBucketAggregateBase<AggregationsStringRareTermsBucketKeys>;
}

interface VulnerabilitiesQuery extends FindingsBaseEsQuery {
  sort: Sort;
  enabled: boolean;
  pageIndex: number;
  pageSize: number;
}

export const getFindingsQuery = ({ query, sort, pageIndex, pageSize }: VulnerabilitiesQuery) => ({
  index: LATEST_VULNERABILITIES_INDEX_PATTERN,
  query: getSafeVulnerabilitiesQueryFilter(query),
  from: pageIndex * pageSize,
  size: pageSize,
  sort,
});

export const useLatestVulnerabilities = (options: VulnerabilitiesQuery) => {
  const {
    data,
    notifications: { toasts },
  } = useKibana().services;
  return useQuery(
    [LATEST_VULNERABILITIES_INDEX_PATTERN, options],
    async () => {
      const {
        rawResponse: { hits },
      } = await lastValueFrom(
        data.search.search<LatestFindingsRequest, LatestFindingsResponse>({
          params: getFindingsQuery(options),
        })
      );

      return {
        page: hits.hits.map((hit) => hit._source!) as CspVulnerabilityFinding[],
        total: number.is(hits.total) ? hits.total : 0,
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
