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
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import type { WidenessOption } from './log_categorization_for_embeddable';
import { WIDENESS } from './log_categorization_for_embeddable';

export function useWiderTimeRange() {
  const { http } = useAiopsAppContext();
  const abortController = useRef(new AbortController());

  const getWiderTimeRange = useCallback(
    async (
      index: string,
      timeField: string,
      timeRange: { from: number; to: number },
      widenessOption: WidenessOption,
      queryIn: QueryDslQueryContainer,
      headers?: HttpFetchOptions['headers']
    ) => {
      const wideness = WIDENESS[widenessOption];
      const widenessMs = moment.duration(wideness.factor, wideness.unit).asMilliseconds();
      const currentWideness = timeRange.to - timeRange.from;

      // the time range is already wide enough
      if (currentWideness > widenessMs) {
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
      const indexWideness = resp.end.epoch - resp.start.epoch;
      if (indexWideness < widenessMs) {
        return {
          from: resp.start.epoch,
          to: resp.end.epoch,
          useSubAgg: true,
        };
      }

      const widenessRemainder = widenessMs - currentWideness;
      const newFrom = Math.max(timeRange.from - widenessRemainder, resp.start.epoch);
      const newTo = Math.min(newFrom + widenessMs, resp.end.epoch);

      return {
        from: newFrom,
        to: newTo,
        useSubAgg: true,
      };
    },
    [http]
  );

  const cancelRequest = useCallback(() => {
    abortController.current.abort();
    abortController.current = new AbortController();
  }, []);

  return { getWiderTimeRange, cancelRequest };
}
