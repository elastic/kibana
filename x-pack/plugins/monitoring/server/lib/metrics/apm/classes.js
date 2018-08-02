/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ClusterMetric, Metric } from '../classes';

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
