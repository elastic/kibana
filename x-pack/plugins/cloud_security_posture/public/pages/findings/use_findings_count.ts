/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from 'react-query';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { lastValueFrom } from 'rxjs';
import type { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/data-plugin/public';
import { useKibana } from '../../common/hooks/use_kibana';
import { showErrorToast } from './latest_findings/use_latest_findings';
import type { FindingsBaseEsQuery } from './types';

type FindingsAggRequest = IKibanaSearchRequest<estypes.SearchRequest>;
type FindingsAggResponse = IKibanaSearchResponse<estypes.SearchResponse<{}, FindingsAggs>>;
interface FindingsAggs extends estypes.AggregationsMultiBucketAggregateBase {
  count: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>;
  };
}

interface UseFindingsCounterData {
  passed: number;
  failed: number;
  newPitId: string;
}

export const getFindingsCountAggQuery = ({
  query,
  pitIdRef,
}: Omit<FindingsBaseEsQuery, 'setPitId'>) => ({
  size: 0,
  track_total_hits: true,
  body: {
    query,
    aggs: { count: { terms: { field: 'result.evaluation.keyword' } } },
    pit: { id: pitIdRef.current },
  },
  ignore_unavailable: false,
});

export const useFindingsCounter = ({ query, pitIdRef, setPitId }: FindingsBaseEsQuery) => {
  const {
    data,
    notifications: { toasts },
  } = useKibana().services;

  return useQuery<FindingsAggResponse, unknown, UseFindingsCounterData>(
    ['csp_findings_counts', { query, pitId: pitIdRef.current }],
    () =>
      lastValueFrom(
        data.search.search<FindingsAggRequest, FindingsAggResponse>({
          params: getFindingsCountAggQuery({ query, pitIdRef }),
        })
      ),
    {
      keepPreviousData: true,
      onError: (err) => showErrorToast(toasts, err),
      select: (response) => ({
        ...(Object.fromEntries(
          response.rawResponse.aggregations!.count.buckets.map((bucket) => [
            bucket.key,
            bucket.doc_count,
          ])!
        ) as { passed: number; failed: number }),
        newPitId: response.rawResponse.pit_id!,
      }),
      onSuccess: ({ newPitId }) => {
        setPitId(newPitId);
      },
    }
  );
};
