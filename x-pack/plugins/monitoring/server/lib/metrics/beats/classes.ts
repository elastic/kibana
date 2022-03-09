/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { i18n } from '@kbn/i18n';

import { ClusterMetric, ClusterMetricOptions, Metric, MetricOptions } from '../classes';
import { SMALL_FLOAT, LARGE_FLOAT, LARGE_BYTES } from '../../../../common/formatting';
import { NORMALIZED_DERIVATIVE_UNIT } from '../../../../common/constants';

const perSecondUnitLabel = i18n.translate('xpack.monitoring.metrics.beats.perSecondUnitLabel', {
  defaultMessage: '/s',
});

type BeatsClusterMetricOptions = Pick<
  ClusterMetricOptions,
  'derivative' | 'format' | 'metricAgg' | 'units' | 'field' | 'label' | 'description'
>;

export class BeatsClusterMetric extends ClusterMetric {
  constructor(opts: BeatsClusterMetricOptions) {
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

type BeatsEventsRateClusterMetricOptions = Pick<
  ClusterMetricOptions,
  'field' | 'title' | 'label' | 'description'
> &
  Partial<Pick<ClusterMetricOptions, 'format'>>;

export class BeatsEventsRateClusterMetric extends BeatsClusterMetric {
  constructor(opts: BeatsEventsRateClusterMetricOptions) {
    super({
      ...opts,
      derivative: true,
      format: LARGE_FLOAT,
      metricAgg: 'max',
      units: perSecondUnitLabel,
    });

    this.aggs = {
      beats_uuids: {
        terms: {
          field: 'beats_stats.beat.uuid',
          size: 10000,
        },
        aggs: {
          event_rate_per_beat: {
            max: {
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

type BeatsMetricOptions = Pick<
  MetricOptions,
  'field' | 'title' | 'label' | 'description' | 'format' | 'metricAgg' | 'units' | 'derivative'
>;

export class BeatsMetric extends Metric {
  constructor(opts: BeatsMetricOptions) {
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

type BeatsByteRateClusterMetricOptions = Pick<
  ClusterMetricOptions,
  'field' | 'title' | 'label' | 'description'
>;
export class BeatsByteRateClusterMetric extends BeatsEventsRateClusterMetric {
  constructor(opts: BeatsByteRateClusterMetricOptions) {
    super({
      ...opts,
      format: LARGE_BYTES,
    });
  }
}

type BeatsEventsRateMetricOptions = Pick<
  MetricOptions,
  'field' | 'title' | 'label' | 'description'
>;
export class BeatsEventsRateMetric extends BeatsMetric {
  constructor(opts: BeatsEventsRateMetricOptions) {
    super({
      ...opts,
      format: LARGE_FLOAT,
      metricAgg: 'max',
      units: perSecondUnitLabel,
      derivative: true,
    });
  }
}

type BeatsByteRateMetricOptions = Pick<MetricOptions, 'field' | 'title' | 'label' | 'description'>;

export class BeatsByteRateMetric extends BeatsMetric {
  constructor(opts: BeatsByteRateMetricOptions) {
    super({
      ...opts,
      format: LARGE_BYTES,
      metricAgg: 'max',
      units: perSecondUnitLabel,
      derivative: true,
    });
  }
}

type BeatsCpuUtilizationMetricOptions = Pick<
  MetricOptions,
  'field' | 'title' | 'label' | 'description'
>;

export class BeatsCpuUtilizationMetric extends BeatsMetric {
  constructor(opts: BeatsCpuUtilizationMetricOptions) {
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

    this.calculation = (
      { metric_deriv: metricDeriv } = { metric_deriv: undefined },
      _key,
      _metric,
      bucketSizeInSeconds
    ) => {
      if (metricDeriv && bucketSizeInSeconds) {
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
