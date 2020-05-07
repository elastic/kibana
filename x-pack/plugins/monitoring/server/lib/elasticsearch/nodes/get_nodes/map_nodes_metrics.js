/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, pluck, min, max, last } from 'lodash';
import { filterPartialBuckets } from '../../../filter_partial_buckets';
import { metrics } from '../../../metrics';

function calcSlope(data) {
  const length = data.length;
  const xSum = data.reduce((prev, curr) => prev + curr.x, 0);
  const ySum = data.reduce((prev, curr) => prev + curr.y, 0);
  const xySum = data.reduce((prev, curr) => prev + curr.y * curr.x, 0);
  const xSqSum = data.reduce((prev, curr) => prev + curr.x * curr.x, 0);
  const numerator = length * xySum - xSum * ySum;
  const denominator = length * xSqSum - xSum * ySum;
  const slope = numerator / denominator;

  if (slope) {
    return slope;
  } else if (slope === 0) {
    return -1; // there is no 0 arrow
  }
  return null; // convert possible NaN to `null` for JSON-friendliness
}

const mapBuckets = (bucket, metric) => {
  const x = bucket.key;

  if (metric.calculation) {
    return {
      x: bucket.key,
      y: metric.calculation(bucket),
    };
  }

  const bucketMetricDeriv = bucket.metric_deriv;
  if (metric.derivative && bucketMetricDeriv) {
    const { value: bucketValue, normalized_value: normalizedBucketValue } = bucketMetricDeriv;
    let y;
    if (Boolean(normalizedBucketValue) || normalizedBucketValue === 0) {
      y = normalizedBucketValue;
    } else if (Boolean(bucketValue) || bucketValue === 0) {
      y = bucketValue;
    } else {
      y = null;
    }

    return { x, y };
  }

  const bucketMetricValue = get(bucket, 'metric.value');
  if (Boolean(bucketMetricValue) || bucketMetricValue === 0) {
    return { x, y: bucketMetricValue };
  }

  return { x, y: null };
};

function reduceMetric(metricName, metricBuckets, { min: startTime, max: endTime, bucketSize }) {
  if (startTime === undefined || endTime === undefined || startTime >= endTime) {
    return null;
  }

  const partialBucketFilter = filterPartialBuckets(startTime, endTime, bucketSize, {
    ignoreEarly: true,
  });
  const metric = metrics[metricName];
  const mappedData = metricBuckets
    .filter(partialBucketFilter) // buckets with whole start/end time range
    .map(bucket => mapBuckets(bucket, metric))
    .filter(result => Boolean(result.y) || result.y === 0); // take only non-null values

  /* it's possible that no data exists for the type of metric. For example,
   * node_cgroup_throttled data could be completely null if there is no cgroup
   * throttling. */
  const allValues = pluck(mappedData, 'y');
  if (allValues.join(',') === '') {
    return; // no data exists for this type of metric
  }

  const minVal = min(pluck(mappedData, 'y'));
  const maxVal = max(pluck(mappedData, 'y'));
  const lastVal = last(pluck(mappedData, 'y'));
  const slope = calcSlope(mappedData) > 0 ? 1 : -1; // no need for the entire precision, it's just an up/down arrow

  return {
    metric: metric.serialize(),
    summary: { minVal, maxVal, lastVal, slope },
  };
}

function reduceAllMetrics(metricSet, timeOptions) {
  const metrics = {};
  Object.keys(metricSet).forEach(metricName => {
    const metricBuckets = get(metricSet, [metricName, 'buckets']);
    metrics[metricName] = reduceMetric(metricName, metricBuckets, timeOptions); // append summarized metric data
  });

  return metrics;
}

/*
 * Incoming metrics for all nodes are date histogram aggregation buckets. This
 * summarizes them into "metric" values for table listing.
 *
 * @param {Object} metricsForNodes: metrics related to each node keyed by nodeId
 * @param {Object} nodesInfo: info about each node from map_nodes_info
 * @param {Object} timeOptions: min, max, and bucketSize needed for date histogram creation
 * @return {Object} summarized metric data about each node keyed by nodeId
 */
export function mapNodesMetrics(metricsForNodes, nodesInfo, timeOptions) {
  const metricRows = {};
  Object.keys(metricsForNodes).forEach(nodeId => {
    if (nodesInfo[nodeId].isOnline) {
      // only do the work of mapping metrics if the node is online
      const metricSet = metricsForNodes[nodeId];
      metricRows[nodeId] = reduceAllMetrics(metricSet, timeOptions);
    }
  });

  return metricRows;
}
