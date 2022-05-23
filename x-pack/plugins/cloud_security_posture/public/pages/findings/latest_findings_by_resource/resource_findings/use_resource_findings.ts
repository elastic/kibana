/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from 'react-query';
import { lastValueFrom } from 'rxjs';
import { IEsSearchResponse } from '@kbn/data-plugin/common';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Pagination } from '@elastic/eui';
import { FINDINGS_REFETCH_INTERVAL_MS } from '../../constants';
import { useKibana } from '../../../../common/hooks/use_kibana';
import { showErrorToast } from '../../latest_findings/use_latest_findings';
import type { CspFindingsQueryData } from '../../types';
import type { CspFinding, FindingsBaseEsQuery, FindingsQueryResult } from '../../types';

interface UseResourceFindingsOptions extends FindingsBaseEsQuery {
  resourceId: string;
  from: NonNullable<estypes.SearchRequest['from']>;
  size: NonNullable<estypes.SearchRequest['size']>;
}

export interface ResourceFindingsQuery {
  pageIndex: Pagination['pageIndex'];
  pageSize: Pagination['pageSize'];
}

export type ResourceFindingsResult = FindingsQueryResult<CspFindingsQueryData | undefined, unknown>;

const getResourceFindingsQuery = ({
  query,
  resourceId,
  from,
  size,
  pitIdRef,
}: Omit<UseResourceFindingsOptions, 'setPitId'>): estypes.SearchRequest => ({
  from,
  size,
  body: {
    query: {
      ...query,
      bool: {
        ...query?.bool,
        filter: [...(query?.bool?.filter || []), { term: { 'resource_id.keyword': resourceId } }],
      },
    },
    pit: { id: pitIdRef.current },
  },
  ignore_unavailable: false,
});

export const useResourceFindings = ({
  query,
  resourceId,
  from,
  size,
  pitIdRef,
  setPitId,
}: UseResourceFindingsOptions) => {
  const {
    data,
    notifications: { toasts },
  } = useKibana().services;

  return useQuery<IEsSearchResponse<CspFinding>, unknown, CspFindingsQueryData>(
    ['csp_resource_findings', { query, resourceId, from, size, pitId: pitIdRef.current }],
    () =>
      lastValueFrom<IEsSearchResponse<CspFinding>>(
        data.search.search({
          params: getResourceFindingsQuery({ query, resourceId, from, size, pitIdRef }),
        })
      ),
    {
      keepPreviousData: true,
      select: ({ rawResponse: { hits, pit_id: newPitId } }) => ({
        page: hits.hits.map((hit) => hit._source!),
        total: hits.total as number,
        newPitId: newPitId!,
      }),
      onError: (err) => showErrorToast(toasts, err),
      onSuccess: ({ newPitId }) => {
        setPitId(newPitId);
      },
      // Refetching on an interval to ensure the PIT window stays open
      refetchInterval: FINDINGS_REFETCH_INTERVAL_MS,
      refetchIntervalInBackground: true,
    }
  );
};
