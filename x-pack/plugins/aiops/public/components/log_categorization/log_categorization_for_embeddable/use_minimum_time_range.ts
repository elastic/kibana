/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useCallback } from 'react';

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { HttpFetchOptions } from '@kbn/core/public';
import { getTimeFieldRange } from '@kbn/ml-date-picker';
import moment from 'moment';
import { useStorage } from '@kbn/ml-local-storage';
import { useAiopsAppContext } from '../../../hooks/use_aiops_app_context';
import type { MinimumTimeRangeOption } from './minimum_time_range';
import { MINIMUM_TIME_RANGE } from './minimum_time_range';
import type { AiOpsKey, AiOpsStorageMapped } from '../../../types/storage';
import { AIOPS_PATTERN_ANALYSIS_MINIMUM_TIME_RANGE_PREFERENCE } from '../../../types/storage';

export function useMinimumTimeRange() {
  const { http } = useAiopsAppContext();
  const abortController = useRef(new AbortController());

  const getMinimumTimeRange = useCallback(
    async (
      index: string,
      timeField: string,
      timeRange: { from: number; to: number },
      minimumTimeRangeOption: MinimumTimeRangeOption,
      queryIn: QueryDslQueryContainer,
      headers?: HttpFetchOptions['headers']
    ) => {
      const minimumTimeRange = MINIMUM_TIME_RANGE[minimumTimeRangeOption];
      const minimumTimeRangeMs = moment
        .duration(minimumTimeRange.factor, minimumTimeRange.unit)
        .asMilliseconds();
      const currentMinimumTimeRange = timeRange.to - timeRange.from;

      // the time range is already wide enough
      if (currentMinimumTimeRange > minimumTimeRangeMs) {
        return { ...timeRange, useSubAgg: false };
      }

      const resp = await getTimeFieldRange({
        http,
        index,
        timeFieldName: timeField,
        query: queryIn,
        path: '/internal/file_upload/time_field_range',
      });

      // the index isn't big enough to get a wider time range
      const indexTimeRangeMs = resp.end.epoch - resp.start.epoch;
      if (indexTimeRangeMs < minimumTimeRangeMs) {
        return {
          from: resp.start.epoch,
          to: resp.end.epoch,
          useSubAgg: true,
        };
      }

      const remainder = minimumTimeRangeMs - currentMinimumTimeRange;
      const newFrom = Math.max(timeRange.from - remainder, resp.start.epoch);
      const newTo = Math.min(newFrom + minimumTimeRangeMs, resp.end.epoch);

      return {
        from: newFrom,
        to: newTo,
        useSubAgg: true,
      };
    },
    [http]
  );

  const [minimumTimeRangeOption, setMinimumTimeRangeOption] = useStorage<
    AiOpsKey,
    AiOpsStorageMapped<typeof AIOPS_PATTERN_ANALYSIS_MINIMUM_TIME_RANGE_PREFERENCE>
  >(AIOPS_PATTERN_ANALYSIS_MINIMUM_TIME_RANGE_PREFERENCE, '1 week');

  const cancelRequest = useCallback(() => {
    abortController.current.abort();
    abortController.current = new AbortController();
  }, []);

  return {
    getMinimumTimeRange,
    cancelRequest,
    minimumTimeRangeOption,
    setMinimumTimeRangeOption,
  };
}
