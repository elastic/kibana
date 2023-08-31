/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import type { IHttpFetchError } from '@kbn/core-http-browser';
import { isDefined } from '@kbn/ml-is-defined';

import type { GetTransformsResponseSchema } from '../../../common/api_schemas/transforms';
import type { GetTransformsStatsResponseSchema } from '../../../common/api_schemas/transforms_stats';
import {
  addInternalBasePath,
  DEFAULT_REFRESH_INTERVAL_MS,
  TRANSFORM_REACT_QUERY_KEYS,
  TRANSFORM_MODE,
} from '../../../common/constants';
import { isTransformStats } from '../../../common/types/transform_stats';

import { type TransformListRow } from '../common';
import { useAppDependencies } from '../app_dependencies';
import { TRANSFORM_ERROR_TYPE } from '../common/transform';

interface UseGetTransformsResponse {
  transforms: TransformListRow[];
  transformIds: string[];
  transformIdsWithoutConfig?: string[];
}

const getInitialData = (): UseGetTransformsResponse => ({
  transforms: [],
  transformIds: [],
});

interface UseGetTransformsOptions {
  enabled?: boolean;
}

export const useGetTransforms = ({ enabled }: UseGetTransformsOptions) => {
  const { http } = useAppDependencies();

  const { data = getInitialData(), ...rest } = useQuery<UseGetTransformsResponse, IHttpFetchError>(
    [TRANSFORM_REACT_QUERY_KEYS.GET_TRANSFORMS],
    async ({ signal }) => {
      const update = getInitialData();

      const transformConfigs = await http.get<GetTransformsResponseSchema>(
        addInternalBasePath('transforms'),
        {
          version: '1',
          asSystemRequest: true,
          signal,
        }
      );
      const transformStats = await http.get<GetTransformsStatsResponseSchema>(
        addInternalBasePath(`transforms/_stats`),
        {
          version: '1',
          asSystemRequest: true,
          signal,
        }
      );

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

        update.transformIdsWithoutConfig =
          danglingTaskIdMatches.length > 0 ? danglingTaskIdMatches : undefined;
      }

      update.transforms = transformConfigs.transforms.reduce((reducedtableRows, config) => {
        const stats = transformStats.transforms.find((d) => config.id === d.id);

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

      update.transformIds = update.transforms.map(({ id }) => id);

      return update;
    },
    {
      enabled,
      refetchInterval: DEFAULT_REFRESH_INTERVAL_MS,
    }
  );

  return { data, ...rest };
};
