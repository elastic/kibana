/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { i18n } from '@kbn/i18n';

import { ClusterMetric, Metric, MetricOptions } from '../classes';
import { SMALL_FLOAT, LARGE_FLOAT } from '../../../../common/formatting';
import { NORMALIZED_DERIVATIVE_UNIT } from '../../../../common/constants';

type ApmClusterMetricOptions = Pick<
  MetricOptions,
  'field' | 'title' | 'label' | 'description' | 'derivative' | 'format' | 'metricAgg' | 'units'
>;
export class ApmClusterMetric extends ClusterMetric {
  constructor(opts: ApmClusterMetricOptions) {
    super({
      ...opts,
      app: 'apm',
      ...ApmClusterMetric.getMetricFields(),
    });
  }

  static getMetricFields() {
    return {
      uuidField: 'cluster_uuid',
      timestampField: 'beats_stats.timestamp',
    };
  }
}

type ApmMetricOptions = Pick<
  MetricOptions,
  'title' | 'label' | 'description' | 'field' | 'format' | 'metricAgg' | 'units' | 'derivative'
>;
export class ApmMetric extends Metric {
  constructor(opts: ApmMetricOptions) {
    super({
      ...opts,
      app: 'apm',
      ...ApmMetric.getMetricFields(),
    });
  }

  static getMetricFields() {
    return {
      uuidField: 'beats_stats.beat.uuid',
      timestampField: 'beats_stats.timestamp',
    };
  }
}

export type ApmMetricFields = ReturnType<typeof ApmMetric.getMetricFields>;

type ApmCpuUtilizationMetricOptions = Pick<
  MetricOptions,
  'title' | 'label' | 'description' | 'field'
>;
export class ApmCpuUtilizationMetric extends ApmMetric {
  constructor(opts: ApmCpuUtilizationMetricOptions) {
    super({
      ...opts,
      format: SMALL_FLOAT,
      metricAgg: 'max',
      units: '%',
      derivative: true,
    });

    this.calculation = (
      { metric_deriv: metricDeriv } = { metric_deriv: undefined },
      _key,
      _metric,
      bucketSizeInSeconds
    ) => {
      if (metricDeriv && bucketSizeInSeconds) {
        const { value: metricDerivValue } = metricDeriv;
        const bucketSizeInMillis = bucketSizeInSeconds * 1000;

        if (metricDerivValue >= 0 && metricDerivValue !== null) {
          return (metricDerivValue / bucketSizeInMillis) * 100;
        }
      }
      return null;
    };
  }
}

type ApmEventsRateClusterMetricOptions = Pick<
  ApmClusterMetricOptions,
  'field' | 'title' | 'label' | 'description'
>;

export class ApmEventsRateClusterMetric extends ApmClusterMetric {
  constructor(opts: ApmEventsRateClusterMetricOptions) {
    super({
      ...opts,
      derivative: true,
      format: LARGE_FLOAT,
      metricAgg: 'max',
      units: i18n.translate('xpack.monitoring.metrics.apm.perSecondUnitLabel', {
        defaultMessage: '/s',
      }),
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
