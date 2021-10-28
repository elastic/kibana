/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { i18n } from '@kbn/i18n';
// @ts-ignore
import { ClusterMetric, Metric } from '../classes';
import { SMALL_FLOAT, LARGE_FLOAT, LARGE_BYTES } from '../../../../common/formatting';
import { NORMALIZED_DERIVATIVE_UNIT } from '../../../../common/constants';

const perSecondUnitLabel = i18n.translate('xpack.monitoring.metrics.beats.perSecondUnitLabel', {
  defaultMessage: '/s',
});

export class BeatsClusterMetric extends ClusterMetric {
  // @ts-ignore
  constructor(opts) {
    super({
      ...opts,
      app: 'beats',
      ...BeatsClusterMetric.getMetricFields(),
    });
  }

  static getMetricFields() {
    return {
      uuidField: 'beats_stats.beat.uuid',
      timestampField: 'beats_stats.timestamp',
    };
  }
}

export class BeatsEventsRateClusterMetric extends BeatsClusterMetric {
  // @ts-ignore
  constructor(opts) {
    super({
      ...opts,
      derivative: true,
      format: LARGE_FLOAT,
      metricAgg: 'max',
      units: perSecondUnitLabel,
    });
    // @ts-ignore

    this.aggs = {
      beats_uuids: {
        terms: {
          field: 'beats_stats.beat.uuid',
          size: 10000,
        },
        aggs: {
          event_rate_per_beat: {
            max: {
              // @ts-ignore
              field: this.field,
            },
          },
        },
      },
      event_rate: {
        sum_bucket: {
          buckets_path: 'beats_uuids>event_rate_per_beat',
          gap_policy: 'skip',
        },
      },
      metric_deriv: {
        derivative: {
          buckets_path: 'event_rate',
          gap_policy: 'skip',
          unit: NORMALIZED_DERIVATIVE_UNIT,
        },
      },
    };
  }
}

export class BeatsMetric extends Metric {
  // @ts-ignore
  constructor(opts) {
    super({
      ...opts,
      app: 'beats',
      ...BeatsMetric.getMetricFields(),
    });
  }

  static getMetricFields() {
    return {
      uuidField: 'beats_stats.beat.uuid',
      timestampField: 'beats_stats.timestamp',
    };
  }
}

export type BeatsMetricFields = ReturnType<typeof BeatsMetric.getMetricFields>;

export class BeatsByteRateClusterMetric extends BeatsEventsRateClusterMetric {
  // @ts-ignore
  constructor(opts) {
    super({
      ...opts,
      format: LARGE_BYTES,
    });
  }
}

export class BeatsEventsRateMetric extends BeatsMetric {
  // @ts-ignore
  constructor(opts) {
    super({
      ...opts,
      format: LARGE_FLOAT,
      metricAgg: 'max',
      units: perSecondUnitLabel,
      derivative: true,
    });
  }
}

export class BeatsByteRateMetric extends BeatsMetric {
  // @ts-ignore
  constructor(opts) {
    super({
      ...opts,
      format: LARGE_BYTES,
      metricAgg: 'max',
      units: perSecondUnitLabel,
      derivative: true,
    });
  }
}

export class BeatsCpuUtilizationMetric extends BeatsMetric {
  // @ts-ignore
  constructor(opts) {
    super({
      ...opts,
      format: SMALL_FLOAT,
      metricAgg: 'max',
      units: '%',
      derivative: true,
    });

    /*
     * Convert a counter of milliseconds of utilization time into a percentage of the bucket size
     */
    // @ts-ignore
    this.calculation = ({ metric_deriv: metricDeriv } = {}, _key, _metric, bucketSizeInSeconds) => {
      if (metricDeriv) {
        const { value } = metricDeriv;
        const bucketSizeInMillis = bucketSizeInSeconds * 1000;

        if (value >= 0 && value !== null) {
          return (value / bucketSizeInMillis) * 100;
        }
      }
      return null;
    };
  }
}
