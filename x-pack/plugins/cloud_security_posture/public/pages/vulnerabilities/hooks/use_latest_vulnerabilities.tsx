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
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { LATEST_VULNERABILITIES_INDEX_PATTERN } from '../../../../common/constants';
import { useKibana } from '../../../common/hooks/use_kibana';
import { showErrorToast } from '../../../common/utils/show_error_toast';
import { MAX_FINDINGS_TO_LOAD } from '../../../common/constants';
import { FindingsBaseEsQuery } from '../../../common/types';
type LatestFindingsRequest = IKibanaSearchRequest<estypes.SearchRequest>;
type LatestFindingsResponse = IKibanaSearchResponse<estypes.SearchResponse<any, FindingsAggs>>;

interface FindingsAggs {
  count: estypes.AggregationsMultiBucketAggregateBase<estypes.AggregationsStringRareTermsBucketKeys>;
}

interface VulnerabilitiesQuery extends FindingsBaseEsQuery {
  sort: estypes.Sort;
  enabled: boolean;
}

export const getFindingsQuery = ({ query, sort }: VulnerabilitiesQuery) => ({
  index: LATEST_VULNERABILITIES_INDEX_PATTERN,
  query: {
    ...query,
    bool: {
      ...query?.bool,
      filter: [
        ...(query?.bool?.filter || []),
        { exists: { field: 'vulnerability.score.base' } },
        { exists: { field: 'vulnerability.score.version' } },
        { exists: { field: 'vulnerability.severity' } },
        { exists: { field: 'resource.name' } },
        { match_phrase: { 'vulnerability.enumeration': 'CVE' } },
      ],
      must_not: [
        ...(query?.bool?.must_not || []),
        { match_phrase: { 'vulnerability.severity': 'UNKNOWN' } },
      ],
    },
  },
  size: MAX_FINDINGS_TO_LOAD,
  sort,
});

export const useLatestVulnerabilities = (options: VulnerabilitiesQuery) => {
  const {
    data,
    notifications: { toasts },
  } = useKibana().services;
  return useQuery(
    [LATEST_VULNERABILITIES_INDEX_PATTERN, { params: options }],
    async () => {
      const {
        rawResponse: { hits },
      } = await lastValueFrom(
        data.search.search<LatestFindingsRequest, LatestFindingsResponse>({
          params: getFindingsQuery(options),
        })
      );

      return {
        page: hits.hits.map((hit) => hit._source!),
        total: number.is(hits.total) ? hits.total : 0,
      };
    },
    {
      enabled: options.enabled,
      keepPreviousData: true,
      onError: (err: Error) => showErrorToast(toasts, err),
    }
  );
};
