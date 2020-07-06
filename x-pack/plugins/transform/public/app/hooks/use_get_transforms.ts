/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  TransformListRow,
  TransformStats,
  TRANSFORM_MODE,
  isTransformStats,
  TransformPivotConfig,
  refreshTransformList$,
  REFRESH_TRANSFORM_LIST_STATE,
} from '../common';

import { useApi } from './use_api';

interface GetTransformsResponse {
  count: number;
  transforms: TransformPivotConfig[];
}

interface GetTransformsStatsResponseOk {
  node_failures?: object;
  count: number;
  transforms: TransformStats[];
}

const isGetTransformsStatsResponseOk = (arg: any): arg is GetTransformsStatsResponseOk => {
  return (
    {}.hasOwnProperty.call(arg, 'count') &&
    {}.hasOwnProperty.call(arg, 'transforms') &&
    Array.isArray(arg.transforms)
  );
};

interface GetTransformsStatsResponseError {
  statusCode: number;
  error: string;
  message: string;
}

type GetTransformsStatsResponse = GetTransformsStatsResponseOk | GetTransformsStatsResponseError;

export type GetTransforms = (forceRefresh?: boolean) => void;

export const useGetTransforms = (
  setTransforms: React.Dispatch<React.SetStateAction<TransformListRow[]>>,
  setErrorMessage: React.Dispatch<
    React.SetStateAction<GetTransformsStatsResponseError | undefined>
  >,
  setIsInitialized: React.Dispatch<React.SetStateAction<boolean>>,
  blockRefresh: boolean
): GetTransforms => {
  const api = useApi();

  let concurrentLoads = 0;

  const getTransforms = async (forceRefresh = false) => {
    if (forceRefresh === true || blockRefresh === false) {
      refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.LOADING);
      concurrentLoads++;

      if (concurrentLoads > 1) {
        return;
      }

      try {
        const transformConfigs: GetTransformsResponse = await api.getTransforms();
        const transformStats: GetTransformsStatsResponse = await api.getTransformsStats();

        const tableRows = transformConfigs.transforms.reduce((reducedtableRows, config) => {
          const stats = isGetTransformsStatsResponseOk(transformStats)
            ? transformStats.transforms.find((d) => config.id === d.id)
            : undefined;

          // A newly created transform might not have corresponding stats yet.
          // If that's the case we just skip the transform and don't add it to the transform list yet.
          if (!isTransformStats(stats)) {
            return reducedtableRows;
          }

          // Table with expandable rows requires `id` on the outer most level
          reducedtableRows.push({
            id: config.id,
            config,
            mode:
              typeof config.sync !== 'undefined' ? TRANSFORM_MODE.CONTINUOUS : TRANSFORM_MODE.BATCH,
            stats,
          });
          return reducedtableRows;
        }, [] as TransformListRow[]);

        setTransforms(tableRows);
        setErrorMessage(undefined);
        setIsInitialized(true);
        refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.IDLE);
      } catch (e) {
        // An error is followed immediately by setting the state to idle.
        // This way we're able to treat ERROR as a one-time-event like REFRESH.
        refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.ERROR);
        refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.IDLE);
        setTransforms([]);
        setErrorMessage(e);
        setIsInitialized(true);
      }
      concurrentLoads--;

      if (concurrentLoads > 0) {
        concurrentLoads = 0;
        getTransforms(true);
        return;
      }
    }
  };

  return getTransforms;
};
