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
type LatestFindingsRequest = IKibanaSearchRequest<estypes.SearchRequest>;
type LatestFindingsResponse = IKibanaSearchResponse<estypes.SearchResponse<any, FindingsAggs>>;

interface FindingsAggs {
  count: estypes.AggregationsMultiBucketAggregateBase<estypes.AggregationsStringRareTermsBucketKeys>;
}

export const getFindingsQuery = ({ query }: any) => ({
  index: LATEST_VULNERABILITIES_INDEX_PATTERN,
  query,
  size: MAX_FINDINGS_TO_LOAD,
});

export const useLatestVulnerabilities = (options: any) => {
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
