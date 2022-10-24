/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { TimeRange } from '@kbn/data-plugin/common';
import { useChangePontDetectionContext } from './change_point_detection_context';
import { useTimefilter, useTimeRangeUpdates } from '../../hooks/use_time_filter';
import { useDataSource } from '../../hooks/use_data_source';
import { useCancellableRequest } from '../../hooks/use_cancellable_request';

interface RequestOptions {
  index: string;
  fn: 'min' | 'max' | 'avg';
  metricField: string;
  timeField: string;
  timeInterval: string;
  timeRange: TimeRange;
}

function getChangePointDetectionRequestBody({
  index,
  fn,
  metricField,
  timeField = '@timestamp',
  // TODO remove default
  timeInterval = '5m',
  timeRange,
}: RequestOptions) {
  return {
    params: {
      index,
      size: 0,
      body: {
        query: {
          bool: {
            filter: [
              {
                range: {
                  [timeField]: {
                    from: timeRange.from,
                    to: timeRange.to,
                  },
                },
              },
            ],
          },
        },
        aggs: {
          over_time: {
            date_histogram: {
              field: timeField,
              fixed_interval: timeInterval,
            },
            aggs: {
              function_value: {
                [fn]: {
                  field: metricField,
                },
              },
            },
          },
          change_point_request: {
            change_point: {
              buckets_path: 'over_time>function_value',
            },
          },
        },
      },
    },
  };
}

export function useChangePointRequest() {
  const { dataView } = useDataSource();
  const timeRange = useTimeRangeUpdates();
  const timefilter = useTimefilter();

  const { timeBuckets, requestParams } = useChangePontDetectionContext();

  useEffect(() => {
    timeBuckets.setInterval('auto');
    timeBuckets.setBounds(timefilter.getActiveBounds());
  }, [timeRange, timeBuckets, timefilter]);

  const requestBoby = useMemo(() => {
    return getChangePointDetectionRequestBody({
      index: dataView.getIndexPattern(),
      fn: requestParams.fn,
      timeRange,
      timeInterval: timeBuckets.getInterval().expression,
      metricField: requestParams.metricField,
      timeField: dataView.timeFieldName!,
    });
  }, [timeRange, dataView, requestParams, timeBuckets]);

  return useCancellableRequest<typeof requestBoby, { rawResponse: ChangePointAggResponse }>(
    requestBoby
  );
}

interface ChangePointAggResponse {
  took: number;
  timed_out: boolean;
  _shards: { total: number; failed: number; successful: number; skipped: number };
  hits: { hits: any[]; total: number; max_score: null };
  aggregations: {
    change_point_request: {
      bucket: { doc_count: number; function_value: { value: number }; key: string };
      type: { distribution_change: { p_value: number; change_point: number } };
    };
    over_time: {
      buckets: Array<{
        key_as_string: string;
        doc_count: number;
        function_value: { value: number };
        key: number;
      }>;
    };
  };
}
