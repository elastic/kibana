/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import { getMetricsDateHistogramParams } from '../helpers/metrics';

const modelPlotAggs = {
  model_lower: {
    avg: {
      field: 'model_lower',
    },
  },
  model_upper: {
    avg: {
      field: 'model_upper',
    },
  },
};

const recordAggs = {
  actual: {
    avg: {
      field: 'actual',
    },
  },
  record_score: {
    max: {
      field: 'record_score',
    },
  },
};

const baseAggregation = {
  by_service: {
    composite: {
      sources: asMutableArray([
        {
          jobId: {
            terms: {
              field: 'job_id',
            },
          },
        },
        {
          partition: {
            terms: {
              field: 'partition_field_value',
            },
          },
        },
        {
          by: {
            terms: {
              field: 'by_field_value',
            },
          },
        },
        {
          detectorIndex: {
            terms: {
              field: 'detector_index',
            },
          },
        },
      ] as const),
      size: 0, // intentionally set to a non-working value, needs to be overridden
    },
    aggs: {
      model_plot: {
        filter: {
          term: {
            result_type: 'model_plot',
          },
        },
        aggs: modelPlotAggs,
      },
      record: {
        filter: {
          term: {
            result_type: 'record',
          },
        },
        aggs: recordAggs,
      },
    },
  },
};

type BaseAggregation = typeof baseAggregation;

function getTimeseriesAggregations({
  start,
  end,
  bucketSizeInSeconds,
}: {
  start: number;
  end: number;
  bucketSizeInSeconds: number;
}) {
  const timeseriesAgg = {
    date_histogram: getMetricsDateHistogramParams({
      start,
      end,
      bucketSizeInSeconds,
      timestampOverride: 'timestamp',
    }),
  };

  return {
    by_service: {
      aggs: {
        model_plot: {
          aggs: {
            timeseries: {
              ...timeseriesAgg,
              aggs: modelPlotAggs,
            },
          },
        },
        record: {
          aggs: {
            timeseries: {
              ...timeseriesAgg,
              aggs: recordAggs,
            },
          },
        },
      },
    },
  };
}

export type AnomalyAggregation<TBucketSize extends number | null> =
  BaseAggregation &
    (TBucketSize extends number
      ? ReturnType<typeof getTimeseriesAggregations>
      : {});

export function getAnomalyAggregation<TBucketSize extends number | null>({
  start,
  end,
  bucketSizeInSeconds,
}: {
  start: number;
  end: number;
  bucketSizeInSeconds: TBucketSize;
}): AnomalyAggregation<TBucketSize> {
  let size: number = 10000;

  if (bucketSizeInSeconds !== null) {
    const expectedBuckets =
      // two date histo aggs, and we don't want to go over the bucket limit
      Math.ceil((end - start) / ((bucketSizeInSeconds as number) * 1000) + 2) *
      2;
    size = Math.floor(size / expectedBuckets);
  }

  const aggregation = merge(
    {},
    baseAggregation,
    {
      by_service: {
        composite: {
          size,
        },
      },
    },
    bucketSizeInSeconds !== null
      ? getTimeseriesAggregations({ start, end, bucketSizeInSeconds })
      : {}
  );

  return aggregation as AnomalyAggregation<TBucketSize>;
}
