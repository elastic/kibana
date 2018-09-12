/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ClusterMetric, Metric } from '../classes';
import { SMALL_FLOAT, LARGE_FLOAT } from '../../../../common/formatting';

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

export class ApmSuccessResponseMetric extends ApmMetric {
  constructor(opts) {
    super({
      ...opts,
      format: SMALL_FLOAT,
      metricAgg: 'max',
      units: '%',
      derivative: true
    });

    const metrics = [
      'beats_stats.metrics.apm-server.server.response.valid.ok',
      'beats_stats.metrics.apm-server.server.response.valid.accepted',
    ];

    this.aggs = metrics.reduce((accum, metric) => {
      const split = metric.split('.');
      const name = split[split.length - 1];
      accum[name] = {
        max: { field: metric }
      };
      accum[`${name}_deriv`] = {
        derivative: { buckets_path: name, gap_policy: 'skip', unit: '1m' }
      };
      return accum;
    }, {});

    this.aggs = {
      ...this.aggs,
      metric_deriv: {
        derivative: {
          buckets_path: 'metric',
          gap_policy: 'skip',
          unit: '1m'
        }
      }
    };

    /*
     * Convert a counter of milliseconds of utilization time into a percentage of the bucket size
     */
    this.calculation = (
      _bucket = {},
      _key,
      _metric,
    ) => {
      if (_bucket.metric_deriv) {
        const total = _bucket.metric_deriv.normalized_value;
        const successes = _bucket.ok_deriv.normalized_value + _bucket.accepted_deriv.normalized_value;

        if (
          total >= 0 &&
          total !== null
        ) {
          return successes / total * 100;
        }
      }
      return null;
    };
  }
}

export class ApmFailureResponseMetric extends ApmMetric {
  constructor(opts) {
    super({
      ...opts,
      format: SMALL_FLOAT,
      metricAgg: 'max',
      units: '%',
      derivative: true
    });

    const metrics = [
      'beats_stats.metrics.apm-server.server.response.errors.toolarge',
      'beats_stats.metrics.apm-server.server.response.errors.validate',
      'beats_stats.metrics.apm-server.server.response.errors.method',
      'beats_stats.metrics.apm-server.server.response.errors.unauthorized',
      'beats_stats.metrics.apm-server.server.response.errors.ratelimit',
      'beats_stats.metrics.apm-server.server.response.errors.queue',
      'beats_stats.metrics.apm-server.server.response.errors.decode',
      'beats_stats.metrics.apm-server.server.response.errors.forbidden',
      'beats_stats.metrics.apm-server.server.response.errors.concurrency',
      'beats_stats.metrics.apm-server.server.response.errors.closed',
    ];

    this.aggs = metrics.reduce((accum, metric) => {
      const split = metric.split('.');
      const name = split[split.length - 1];
      accum[name] = {
        max: { field: metric }
      };
      accum[`${name}_deriv`] = {
        derivative: { buckets_path: name, gap_policy: 'skip', unit: '1m' }
      };
      return accum;
    }, {});

    this.aggs = {
      ...this.aggs,
      metric_deriv: {
        derivative: {
          buckets_path: 'metric',
          gap_policy: 'skip',
          unit: '1m'
        }
      }
    };

    /*
     * Convert a counter of milliseconds of utilization time into a percentage of the bucket size
     */
    this.calculation = (
      _bucket = {},
      _key,
      _metric,
    ) => {
      if (_bucket.metric_deriv) {
        const total = _bucket.metric_deriv.normalized_value;
        const failures = _bucket.toolarge_deriv.normalized_value
          + _bucket.validate_deriv.normalized_value
          + _bucket.method_deriv.normalized_value
          + _bucket.unauthorized_deriv.normalized_value
          + _bucket.ratelimit_deriv.normalized_value
          + _bucket.queue_deriv.normalized_value
          + _bucket.decode_deriv.normalized_value
          + _bucket.forbidden_deriv.normalized_value
          + _bucket.concurrency_deriv.normalized_value
          + _bucket.closed_deriv.normalized_value;

        if (
          total >= 0 &&
          total !== null
        ) {
          return failures  / total * 100;
        }
      }
      return null;
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

export class ApmEventsRateClusterMetric extends ApmClusterMetric {
  constructor(opts) {
    super({
      ...opts,
      derivative: true,
      format: LARGE_FLOAT,
      metricAgg: 'max',
      units: '/m'
    });

    this.aggs = {
      beats_uuids: {
        terms: {
          field: 'beats_stats.beat.uuid',
          size: 10000
        },
        aggs: {
          event_rate_per_beat: {
            max: {
              field: this.field
            }
          }
        }
      },
      event_rate: {
        sum_bucket: {
          buckets_path: 'beats_uuids>event_rate_per_beat',
          gap_policy: 'skip'
        }
      },
      metric_deriv: {
        derivative: {
          buckets_path: 'event_rate',
          gap_policy: 'skip',
          unit: '1m'
        }
      }
    };
  }
}
