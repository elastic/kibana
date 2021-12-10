/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ClusterMetric, Metric } from '../classes';
import { NORMALIZED_DERIVATIVE_UNIT } from '../../../../common/constants';

export class KibanaClusterMetric extends ClusterMetric {
  constructor(opts) {
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

export class KibanaEventsRateClusterMetric extends KibanaClusterMetric {
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

export class KibanaMetric extends Metric {
  constructor(opts) {
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

export class KibanaEventLogMetric extends Metric {
  constructor(opts) {
    super({
      ...opts,
      app: 'kibana',
      ...KibanaEventLogMetric.getMetricFields(),
    });

    const dataByRuleId = {};

    this.dateHistogramSubAggs = {
      rules: {
        terms: {
          field: 'kibana_metrics.event_log.rule.id',
          size: 1000,
        },
        aggs: {
          name: {
            top_hits: {
              size: 1,
              _source: 'kibana_metrics.event_log.rule.name',
            },
          },
          metric: {
            [opts.metricAgg]: {
              field: opts.field,
            },
          },
        },
      },
    };

    this.calculation = (bucket) => {
      if (bucket.rules.buckets.length) {
        const ruleId = bucket.rules.buckets[0].key;
        const metricValue = bucket.rules.buckets[0].metric.value;
        const ruleName =
          bucket.rules.buckets[0].name.hits.hits[0]._source.kibana_metrics.event_log.rule.name;
        dataByRuleId[ruleId] = dataByRuleId[ruleId] || { ruleName, data: [] };
        dataByRuleId[ruleId].data.push(metricValue);
      }
      return null;
    };

    this.postProcess = (rows) => {
      const row = rows[0];
      return Object.keys(dataByRuleId).map((ruleId) => {
        const { ruleName, data } = dataByRuleId[ruleId];
        return {
          ...row,
          metric: {
            ...row.metric,
            label: `Average of event.duration for ${ruleName}`,
            description: `Blah for ${ruleName}`,
          },
          data: row.data.map((dataPoint, index) => {
            return [dataPoint[0], data[index]];
          }),
        };
      });
    };
  }

  static getMetricFields() {
    return {
      uuidField: 'kibana_metrics.kibana.uuid',
      timestampField: 'kibana_metrics.timestamp',
    };
  }
}
