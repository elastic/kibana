/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpFetchError } from '@kbn/core/public';
import {
  isGetTransformNodesResponseSchema,
  isGetTransformsResponseSchema,
  isGetTransformsStatsResponseSchema,
} from '../../../common/api_schemas/type_guards';
import { TRANSFORM_MODE } from '../../../common/constants';
import { isTransformStats } from '../../../common/types/transform_stats';

import { TransformListRow, refreshTransformList$, REFRESH_TRANSFORM_LIST_STATE } from '../common';

import { useApi } from './use_api';
import { TRANSFORM_ERROR_TYPE } from '../common/transform';
import { isDefined } from '../../../common/types/common';

export type GetTransforms = (forceRefresh?: boolean) => void;

export const useGetTransforms = (
  setTransforms: React.Dispatch<React.SetStateAction<TransformListRow[]>>,
  setTransformNodes: React.Dispatch<React.SetStateAction<number>>,
  setErrorMessage: React.Dispatch<React.SetStateAction<HttpFetchError | undefined>>,
  setTransformIdsWithoutConfig: React.Dispatch<React.SetStateAction<string[] | undefined>>,
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

      const fetchOptions = { asSystemRequest: true };
      const transformNodes = await api.getTransformNodes();
      const transformConfigs = await api.getTransforms(fetchOptions);
      const transformStats = await api.getTransformsStats(fetchOptions);

      if (
        !isGetTransformsResponseSchema(transformConfigs) ||
        !isGetTransformsStatsResponseSchema(transformStats) ||
        !isGetTransformNodesResponseSchema(transformNodes)
      ) {
        // An error is followed immediately by setting the state to idle.
        // This way we're able to treat ERROR as a one-time-event like REFRESH.
        refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.ERROR);
        refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.IDLE);
        setTransformNodes(0);
        setTransforms([]);

        setIsInitialized(true);

        if (!isGetTransformsResponseSchema(transformConfigs)) {
          setErrorMessage(transformConfigs);
        } else if (!isGetTransformsStatsResponseSchema(transformStats)) {
          setErrorMessage(transformStats);
        }

        return;
      }

      // There might be some errors with fetching certain transforms
      // For example, when task exists and is running but the config is deleted
      if (Array.isArray(transformConfigs.errors) && transformConfigs.errors.length > 0) {
        const danglingTaskIdMatches = transformConfigs.errors
          .filter((e) => e.type === TRANSFORM_ERROR_TYPE.DANGLING_TASK)
          .map((e) => {
            // Getting the transform id from the ES error message
            const matches = /\[([^)]+)\]/.exec(e.reason);
            return Array.isArray(matches) && matches.length >= 1 ? matches[1] : undefined;
          })
          .filter(isDefined);

        setTransformIdsWithoutConfig(
          danglingTaskIdMatches.length > 0 ? danglingTaskIdMatches : undefined
        );
      } else {
        setTransformIdsWithoutConfig(undefined);
      }

      const tableRows = transformConfigs.transforms.reduce((reducedtableRows, config) => {
        const stats = isGetTransformsStatsResponseSchema(transformStats)
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
          alerting_rules: config.alerting_rules,
        });
        return reducedtableRows;
      }, [] as TransformListRow[]);

      setTransformNodes(transformNodes.count);
      setTransforms(tableRows);
      setErrorMessage(undefined);
      setIsInitialized(true);
      refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.IDLE);

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
