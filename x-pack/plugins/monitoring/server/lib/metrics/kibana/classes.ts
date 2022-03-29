/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { ClusterMetric, Metric, MetricOptions } from '../classes';
import { NORMALIZED_DERIVATIVE_UNIT } from '../../../../common/constants';

type KibanaClusterMetricOptions = Pick<
  MetricOptions,
  'field' | 'label' | 'description' | 'format' | 'units' | 'metricAgg' | 'derivative'
> &
  Partial<Pick<MetricOptions, 'title'>>;

export class KibanaClusterMetric extends ClusterMetric {
  constructor(opts: KibanaClusterMetricOptions) {
    super({
      ...opts,
      app: 'kibana',
      ...KibanaClusterMetric.getMetricFields(),
    });
  }

  static getMetricFields() {
    return {
      uuidField: 'cluster_uuid',
      timestampField: 'kibana_stats.timestamp',
    };
  }
}

export class KibanaClusterRuleMetric extends ClusterMetric {
  constructor(opts: KibanaClusterMetricOptions) {
    super({
      ...opts,
      app: 'kibana',
      ...KibanaClusterRuleMetric.getMetricFields(),
    });
  }

  static getMetricFields() {
    return {
      uuidField: 'cluster_uuid',
      timestampField: 'timestamp', // This will alias to @timestamp
    };
  }
}

export class KibanaInstanceRuleMetric extends Metric {
  constructor(opts: KibanaClusterMetricOptions) {
    super({
      ...opts,
      app: 'kibana',
      ...KibanaInstanceRuleMetric.getMetricFields(),
    });
  }

  static getMetricFields() {
    return {
      uuidField: 'kibana_stats.kibana.uuid', // This field does not exist in the MB document but the alias exists
      timestampField: 'timestamp', // This will alias to @timestamp
    };
  }
}

export class KibanaClusterActionMetric extends ClusterMetric {
  constructor(opts: KibanaClusterMetricOptions) {
    super({
      ...opts,
      app: 'kibana',
      ...KibanaClusterActionMetric.getMetricFields(),
    });
  }

  static getMetricFields() {
    return {
      uuidField: 'cluster_uuid',
      timestampField: 'timestamp', // This will alias to @timestamp
    };
  }
}

export class KibanaInstanceActionMetric extends Metric {
  constructor(opts: KibanaClusterMetricOptions) {
    super({
      ...opts,
      app: 'kibana',
      ...KibanaInstanceActionMetric.getMetricFields(),
    });
  }

  static getMetricFields() {
    return {
      uuidField: 'kibana_stats.kibana.uuid', // This field does not exist in the MB document but the alias exists
      timestampField: 'timestamp', // This will alias to @timestamp
    };
  }
}

export class KibanaEventsRateClusterMetric extends KibanaClusterMetric {
  constructor(opts: KibanaEventsRateClusterMetricOptions) {
    super({
      ...opts,
      metricAgg: 'max',
    });

    this.aggs = {
      kibana_uuids: {
        terms: {
          field: 'kibana_stats.kibana.uuid',
          size: 1000,
        },
        aggs: {
          event_rate_per_instance: {
            max: {
              field: this.field,
            },
          },
        },
      },
      event_rate: {
        sum_bucket: {
          buckets_path: 'kibana_uuids>event_rate_per_instance',
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

type KibanaEventsRateClusterMetricOptions = Pick<
  MetricOptions,
  'field' | 'label' | 'description' | 'format' | 'units'
> &
  Partial<Pick<MetricOptions, 'title'>>;

type KibanaMetricOptions = Pick<
  MetricOptions,
  'field' | 'label' | 'description' | 'format' | 'metricAgg' | 'units'
> &
  Partial<Pick<MetricOptions, 'title'>>;

export class KibanaMetric extends Metric {
  constructor(opts: KibanaMetricOptions) {
    super({
      ...opts,
      app: 'kibana',
      ...KibanaMetric.getMetricFields(),
    });
  }

  static getMetricFields() {
    return {
      uuidField: 'kibana_stats.kibana.uuid',
      timestampField: 'kibana_stats.timestamp',
    };
  }
}
