/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { TimeRange } from '@kbn/data-plugin/common';
import type { Filter } from '@kbn/es-query';
import {
  ChangePointDetectionRequestParams,
  ChangePointType,
} from './change_point_detection_context';
import { useDataSource } from '../../hooks/use_data_source';
import { useCancellableRequest } from '../../hooks/use_cancellable_request';

interface RequestOptions {
  index: string;
  fn: string;
  metricField: string;
  splitField: string;
  timeField: string;
  timeInterval: string;
  timeRange: TimeRange;
}

function getChangePointDetectionRequestBody(
  { index, fn, metricField, splitField, timeField, timeInterval, timeRange }: RequestOptions,
  filters: Filter[]
) {
  const appliedFilters = filters.map((v) => v.query);

  return {
    params: {
      index,
      size: 0,
      body: {
        query: {
          bool: {
            filter: [
              ...appliedFilters,
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
        aggregations: {
          groupings: {
            terms: {
              field: splitField,
            },
            aggregations: {
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
      },
    },
  };
}

export function useChangePointRequest(
  requestParams: ChangePointDetectionRequestParams,
  timeRange: TimeRange,
  filters: Filter[]
) {
  const { dataView } = useDataSource();

  const requestBoby = useMemo(() => {
    const params = {
      index: dataView.getIndexPattern(),
      fn: requestParams.fn,
      timeRange,
      timeInterval: requestParams.interval,
      metricField: requestParams.metricField,
      timeField: dataView.timeFieldName!,
      splitField: requestParams.splitField,
    };

    return getChangePointDetectionRequestBody(params, filters);
  }, [timeRange, dataView, requestParams, filters]);

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
    groupings: {
      buckets: Array<{
        key: string;
        doc_count: number;
        over_time: {
          buckets: Array<{
            key_as_string: string;
            doc_count: number;
            function_value: { value: number };
            key: number;
          }>;
        };
        change_point_request: {
          bucket?: { doc_count: number; function_value: { value: number }; key: string };
          type: { [key in ChangePointType]: { p_value: number; change_point: number } };
        };
      }>;
    };
  };
}
