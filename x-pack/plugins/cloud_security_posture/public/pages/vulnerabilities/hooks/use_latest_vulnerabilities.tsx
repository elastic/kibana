/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useInfiniteQuery } from '@tanstack/react-query';
import { lastValueFrom } from 'rxjs';
import type { IKibanaSearchResponse, IKibanaSearchRequest } from '@kbn/search-types';
import { number } from 'io-ts';
import {
  SearchRequest,
  SearchResponse,
  AggregationsMultiBucketAggregateBase,
  AggregationsStringRareTermsBucketKeys,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { EsHitRecord } from '@kbn/discover-utils/types';
import { MAX_FINDINGS_TO_LOAD } from '../../../common/constants';
import { CspVulnerabilityFinding } from '../../../../common/schemas';
import {
  LATEST_VULNERABILITIES_INDEX_PATTERN,
  LATEST_VULNERABILITIES_RETENTION_POLICY,
} from '../../../../common/constants';
import { useKibana } from '../../../common/hooks/use_kibana';
import { showErrorToast } from '../../../common/utils/show_error_toast';
import { FindingsBaseEsQuery } from '../../../common/types';
import { VULNERABILITY_FIELDS } from '../constants';
import { getCaseInsensitiveSortScript } from '../utils/custom_sort_script';
type LatestFindingsRequest = IKibanaSearchRequest<SearchRequest>;
type LatestFindingsResponse = IKibanaSearchResponse<
  SearchResponse<CspVulnerabilityFinding, FindingsAggs>
>;

interface FindingsAggs {
  count: AggregationsMultiBucketAggregateBase<AggregationsStringRareTermsBucketKeys>;
}
interface VulnerabilitiesQuery extends FindingsBaseEsQuery {
  sort: string[][];
  enabled: boolean;
  pageSize: number;
}

const getMultiFieldsSort = (sort: string[][]) => {
  return sort.map(([id, direction]) => {
    if (id === VULNERABILITY_FIELDS.PACKAGE_NAME) {
      return getCaseInsensitiveSortScript(id, direction);
    }

    return {
      [id]: direction,
    };
  });
};

export const getVulnerabilitiesQuery = (
  { query, sort }: VulnerabilitiesQuery,
  pageParam: number
) => ({
  index: LATEST_VULNERABILITIES_INDEX_PATTERN,
  sort: getMultiFieldsSort(sort),
  size: MAX_FINDINGS_TO_LOAD,
  query: {
    ...query,
    bool: {
      ...query?.bool,
      filter: [
        ...(query?.bool?.filter ?? []),
        {
          range: {
            '@timestamp': {
              gte: `now-${LATEST_VULNERABILITIES_RETENTION_POLICY}`,
              lte: 'now',
            },
          },
        },
      ],
    },
  },
  ...(pageParam ? { from: pageParam } : {}),
});

export const useLatestVulnerabilities = (options: VulnerabilitiesQuery) => {
  const {
    data,
    notifications: { toasts },
  } = useKibana().services;
  /**
   * We're using useInfiniteQuery in this case to allow the user to fetch more data (if available and up to 10k)
   * useInfiniteQuery differs from useQuery because it accumulates and caches a chunk of data from the previous fetches into an array
   * it uses the getNextPageParam to know if there are more pages to load and retrieve the position of
   * the last loaded record to be used as a from parameter to fetch the next chunk of data.
   */
  return useInfiniteQuery(
    [LATEST_VULNERABILITIES_INDEX_PATTERN, options],
    async ({ pageParam }) => {
      const {
        rawResponse: { hits },
      } = await lastValueFrom(
        data.search.search<LatestFindingsRequest, LatestFindingsResponse>({
          params: getVulnerabilitiesQuery(options, pageParam),
        })
      );

      return {
        page: hits.hits.map((hit) => buildDataTableRecord(hit as EsHitRecord)),
        total: number.is(hits.total) ? hits.total : 0,
      };
    },
    {
      staleTime: 5000,
      keepPreviousData: true,
      enabled: options.enabled,
      onError: (err: Error) => showErrorToast(toasts, err),
      getNextPageParam: (lastPage, allPages) => {
        if (lastPage.page.length < options.pageSize) {
          return undefined;
        }
        return allPages.length * options.pageSize;
      },
    }
  );
};
