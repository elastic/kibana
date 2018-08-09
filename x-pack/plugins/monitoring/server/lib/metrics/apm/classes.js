/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ClusterMetric, Metric } from '../classes';
import { SMALL_FLOAT } from '../../../../common/formatting';

export class ApmClusterMetric extends ClusterMetric {
  constructor(opts) {
    super({
      ...opts,
      app: 'apm',
      ...ApmClusterMetric.getMetricFields()
    });
  }

  static getMetricFields() {
    return {
      uuidField: 'cluster_uuid',
      timestampField: 'beats_stats.timestamp'
    };
  }
}

export class ApmMetric extends Metric {
  constructor(opts) {
    super({
      ...opts,
      app: 'apm',
      ...ApmMetric.getMetricFields()
    });
  }

  static getMetricFields() {
    return {
      uuidField: 'beats_stats.beat.uuid',
      timestampField: 'beats_stats.timestamp'
    };
  }
}

export class ApmCpuUtilizationMetric extends ApmMetric {
  constructor(opts) {
    super({
      ...opts,
      format: SMALL_FLOAT,
      metricAgg: 'max',
      units: '%',
      derivative: true
    });

    /*
     * Convert a counter of milliseconds of utilization time into a percentage of the bucket size
     */
    this.calculation = (
      { metric_deriv: metricDeriv } = {},
      _key,
      _metric,
      bucketSizeInSeconds
    ) => {
      if (metricDeriv) {
        const { normalized_value: metricDerivNormalizedValue } = metricDeriv;
        const bucketSizeInMillis = bucketSizeInSeconds * 1000;

        if (
          metricDerivNormalizedValue >= 0 &&
          metricDerivNormalizedValue !== null
        ) {
          return metricDerivNormalizedValue / bucketSizeInMillis * 100;
        }
      }
      return null;
    };
  }
}
