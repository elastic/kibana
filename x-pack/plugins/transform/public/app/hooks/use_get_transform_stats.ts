/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQueries, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';

import type { IHttpFetchError } from '@kbn/core-http-browser';

import { useMemo } from 'react';
import type { GetTransformsStatsResponseSchema } from '../../../common/api_schemas/transforms_stats';
import { addInternalBasePath, TRANSFORM_REACT_QUERY_KEYS } from '../../../common/constants';
import type { TransformId } from '../../../common/types/transform';

import { useAppDependencies } from '../app_dependencies';
import type { BulkTransformsStat } from '../common/transform_list';

export const useGetTransformStats = (
  transformId: TransformId,
  enabled?: boolean,
  refetchInterval?: number | false
) => {
  const { http } = useAppDependencies();

  return useQuery<GetTransformsStatsResponseSchema, IHttpFetchError>(
    [TRANSFORM_REACT_QUERY_KEYS.GET_TRANSFORM_STATS, transformId],
    ({ signal }) =>
      http.get<GetTransformsStatsResponseSchema>(
        addInternalBasePath(`transforms/${transformId}/_stats`),
        {
          version: '1',
          signal,
        }
      ),
    { enabled, refetchInterval }
  );
};

export const useBulkTransformsStats = ({
  transformIds,
  enabled,
  refetchInterval,
}: {
  transformIds: string[];
  enabled?: boolean;
  refetchInterval?: number | false;
}): {
  isLoading: boolean;
  error: string | null;
  data: BulkTransformsStat[];
} => {
  const { http } = useAppDependencies();

  const resp = useQueries<GetTransformsStatsResponseSchema[]>({
    queries: transformIds.map((transformId) => {
      return {
        queryKey: [TRANSFORM_REACT_QUERY_KEYS.GET_TRANSFORM_STATS, transformId],
        queryFn: async ({ signal }) =>
          http.get<GetTransformsStatsResponseSchema>(
            addInternalBasePath(`transforms/${transformId}/_stats`),
            {
              version: '1',
              signal,
            }
          ),
        enabled,
        refetchInterval,
      };
    }),
    // @ts-ignore useQueries not returning the right type for failureReason
  }) as Array<UseQueryResult<GetTransformsStatsResponseSchema, IHttpFetchError>>;

  return useMemo(() => {
    const isLoading = resp.some((r) => r.status === 'loading');
    const data = resp.map((r, idx) => {
      const id = transformIds[idx];
      const fetchStatus = r.status;
      if (r.status === 'success') {
        const transform = r.data?.transforms[0];
        // transform already has id
        return { fetchStatus, ...transform } as BulkTransformsStat;
      }

      if (r.status === 'error') {
        return {
          id,
          fetchStatus,
          fetchError: r.failureReason,
        } as BulkTransformsStat;
      }

      return { id, fetchStatus } as BulkTransformsStat;
    });
    const errors = data.filter((r) => r.fetchStatus === 'error');
    const error =
      errors.length > 0
        ? i18n.translate('xpack.transform.list.transformStatsErrorPromptContent', {
            defaultMessage:
              'Failed to get stats for the following transforms: {transformsIdsWithError}',
            values: { transformsIdsWithError: errors.map((e) => e.id).join(',') },
          })
        : null;

    return { isLoading, error, data, errors };
  }, [resp, transformIds]);
};
