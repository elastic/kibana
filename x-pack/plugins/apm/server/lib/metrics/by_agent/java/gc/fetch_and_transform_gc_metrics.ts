/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sum, round } from 'lodash';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { isFiniteNumber } from '../../../../../../common/utils/is_finite_number';
import { Setup, SetupTimeRange } from '../../../../helpers/setup_request';
import { getMetricsDateHistogramParams } from '../../../../helpers/metrics';
import { ChartBase } from '../../../types';
import { getMetricsProjection } from '../../../../../projections/metrics';
import { mergeProjection } from '../../../../../projections/util/merge_projection';
import {
  AGENT_NAME,
  LABEL_NAME,
  METRIC_JAVA_GC_COUNT,
  METRIC_JAVA_GC_TIME,
} from '../../../../../../common/elasticsearch_fieldnames';
import { getBucketSize } from '../../../../helpers/get_bucket_size';
import { getVizColorForIndex } from '../../../../../../common/viz_colors';
import { JAVA_AGENT_NAMES } from '../../../../../../common/agent_name';

export async function fetchAndTransformGcMetrics({
  environment,
  kuery,
  setup,
  serviceName,
  serviceNodeName,
  chartBase,
  fieldName,
  operationName,
}: {
  environment?: string;
  kuery?: string;
  setup: Setup & SetupTimeRange;
  serviceName: string;
  serviceNodeName?: string;
  chartBase: ChartBase;
  fieldName: typeof METRIC_JAVA_GC_COUNT | typeof METRIC_JAVA_GC_TIME;
  operationName: string;
}) {
  const { start, end, apmEventClient, config } = setup;

  const { bucketSize } = getBucketSize({ start, end });

  const projection = getMetricsProjection({
    environment,
    kuery,
    setup,
    serviceName,
    serviceNodeName,
  });

  // GC rate and time are reported by the agents as monotonically
  // increasing counters, which means that we have to calculate
  // the delta in an es query. In the future agent might start
  // reporting deltas.
  const params = mergeProjection(projection, {
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            ...projection.body.query.bool.filter,
            { exists: { field: fieldName } },
            { terms: { [AGENT_NAME]: JAVA_AGENT_NAMES } },
          ],
        },
      },
      aggs: {
        per_pool: {
          terms: {
            field: `${LABEL_NAME}`,
          },
          aggs: {
            timeseries: {
              date_histogram: getMetricsDateHistogramParams(
                start,
                end,
                config['xpack.apm.metricsInterval']
              ),
              aggs: {
                // get the max value
                max: {
                  max: {
                    field: fieldName,
                  },
                },
                // get the derivative, which is the delta y
                derivative: {
                  derivative: {
                    buckets_path: 'max',
                  },
                },
                // if a gc counter is reset, the delta will be >0 and
                // needs to be excluded
                value: {
                  bucket_script: {
                    buckets_path: { value: 'derivative' },
                    script: 'params.value > 0.0 ? params.value : 0.0',
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const response = await apmEventClient.search(operationName, params);

  const { aggregations } = response;

  if (!aggregations) {
    return {
      ...chartBase,
      noHits: true,
      series: [],
    };
  }

  const series = aggregations.per_pool.buckets.map((poolBucket, i) => {
    const label = poolBucket.key as string;
    const timeseriesData = poolBucket.timeseries;

    const data = timeseriesData.buckets.map((bucket) => {
      // derivative/value will be undefined for the first hit and if the `max` value is null
      const bucketValue = bucket.value?.value;
      const y = isFiniteNumber(bucketValue)
        ? round(bucketValue * (60 / bucketSize), 1)
        : null;

      return {
        y,
        x: bucket.key,
      };
    });

    const values = data
      .map((coordinate) => coordinate.y)
      .filter((y) => y !== null);

    const overallValue = sum(values) / values.length;

    return {
      title: label,
      key: label,
      type: chartBase.type,
      color: getVizColorForIndex(i, theme),
      overallValue,
      data,
    };
  });

  return {
    ...chartBase,
    noHits: response.hits.total.value === 0,
    series,
  };
}
