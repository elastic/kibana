/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { number } from 'io-ts';
import { lastValueFrom } from 'rxjs';
import type { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/data-plugin/common';
import type { CoreStart } from '@kbn/core/public';
import type { Pagination } from '@elastic/eui';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { i18n } from '@kbn/i18n';
import { CspFinding } from '../../../../common/schemas/csp_finding';
import { FindingsEsPitContext } from '../es_pit/findings_es_pit_context';
import { extractErrorMessage } from '../../../../common/utils/helpers';
import type { Sort } from '../types';
import { useKibana } from '../../../common/hooks/use_kibana';
import type { FindingsBaseEsQuery } from '../types';
import { FINDINGS_REFETCH_INTERVAL_MS } from '../constants';
import { getAggregationCount, getFindingsCountAggQuery } from '../utils/utils';

interface UseFindingsOptions extends FindingsBaseEsQuery {
  from: NonNullable<NonNullable<estypes.SearchRequest['body']>['from']>;
  size: NonNullable<NonNullable<estypes.SearchRequest['body']>['size']>;
  sort: Sort<CspFinding>;
  enabled: boolean;
}

export interface FindingsGroupByNoneQuery {
  pageIndex: Pagination['pageIndex'];
  pageSize: Pagination['pageSize'];
  sort: Sort<CspFinding>;
}

type LatestFindingsRequest = IKibanaSearchRequest<estypes.SearchRequest>;
type LatestFindingsResponse = IKibanaSearchResponse<
  estypes.SearchResponse<CspFinding, FindingsAggs>
>;

interface FindingsAggs {
  count: estypes.AggregationsMultiBucketAggregateBase<estypes.AggregationsStringRareTermsBucketKeys>;
}

const SEARCH_FAILED_TEXT = i18n.translate(
  'xpack.csp.findings.findingsErrorToast.searchFailedTitle',
  { defaultMessage: 'Search failed' }
);

export const showErrorToast = (
  toasts: CoreStart['notifications']['toasts'],
  error: unknown
): void => {
  if (error instanceof Error) toasts.addError(error, { title: SEARCH_FAILED_TEXT });
  else toasts.addDanger(extractErrorMessage(error, SEARCH_FAILED_TEXT));
};

export const getFindingsQuery = ({
  query,
  size,
  from,
  sort,
  pitId,
}: UseFindingsOptions & { pitId: string }) => ({
  body: {
    query,
    sort: [{ [sort.field]: sort.direction }],
    size,
    from,
    aggs: getFindingsCountAggQuery(),
  },
  pit: { id: pitId },
  ignore_unavailable: false,
});

export const useLatestFindings = (options: UseFindingsOptions) => {
  const {
    data,
    notifications: { toasts },
  } = useKibana().services;
  const { pitIdRef, setPitId } = useContext(FindingsEsPitContext);
  const params = { ...options, pitId: pitIdRef.current };

  return useQuery(
    ['csp_findings', { params }],
    async () => {
      const {
        rawResponse: { hits, aggregations, pit_id: newPitId },
      } = await lastValueFrom(
        data.search.search<LatestFindingsRequest, LatestFindingsResponse>({
          params: getFindingsQuery(params),
        })
      );

      if (!aggregations) throw new Error('expected aggregations to be an defined');

      if (!Array.isArray(aggregations.count.buckets))
        throw new Error('expected buckets to be an array');

      return {
        page: hits.hits.map((hit) => hit._source!),
        total: number.is(hits.total) ? hits.total : 0,
        count: getAggregationCount(aggregations.count.buckets),
        newPitId: newPitId!,
      };
    },
    {
      enabled: options.enabled,
      keepPreviousData: true,
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
