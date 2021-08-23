/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClusterMetric, Metric } from '../classes';
import { NORMALIZED_DERIVATIVE_UNIT } from '../../../../common/constants';

export class EnterpriseSearchClusterMetric extends ClusterMetric {
  constructor(opts) {
    super({
      ...opts,
      app: 'enterprise_search',
      ...EnterpriseSearchClusterMetric.getMetricFields(),
    });
  }

  static getMetricFields() {
    return {
      uuidField: 'enterprisesearch.health.cluster_uuid',
      timestampField: 'timestamp',
    };
  }
}

export class EnterpriseSearchHealthClusterMetric extends EnterpriseSearchClusterMetric {
  constructor(opts) {
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

export class EnterpriseSearchMetric extends Metric {
  constructor(opts) {
    super({
      ...opts,
      app: 'enterprise_search',
      ...EnterpriseSearchMetric.getMetricFields(),
    });
  }

  static getMetricFields() {
    return {
      uuidField: 'enterprisesearch.health.cluster_uuid',
      timestampField: 'timestamp',
    };
  }
}
