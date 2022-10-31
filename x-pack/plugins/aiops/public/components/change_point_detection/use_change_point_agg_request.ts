/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { type QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
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
}

function getChangePointDetectionRequestBody(
  { index, fn, metricField, splitField, timeInterval, timeField }: RequestOptions,
  query: QueryDslQueryContainer
) {
  return {
    params: {
      index,
      size: 0,
      body: {
        query,
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
  query: QueryDslQueryContainer
) {
  const { dataView } = useDataSource();

  const requestPayload = useMemo(() => {
    const params = {
      index: dataView.getIndexPattern(),
      fn: requestParams.fn,
      timeInterval: requestParams.interval,
      metricField: requestParams.metricField,
      timeField: dataView.timeFieldName!,
      splitField: requestParams.splitField,
    };

    return getChangePointDetectionRequestBody(params, query);
  }, [dataView, requestParams, query]);

  return useCancellableRequest<typeof requestPayload, { rawResponse: ChangePointAggResponse }>(
    requestPayload
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
          type: {
            [key in ChangePointType]: { p_value: number; change_point: number; reason?: string };
          };
        };
      }>;
    };
  };
}
