/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get, sortBy, reverse } from 'lodash';
import { ClusterMetric, Metric } from '../classes';
import { NORMALIZED_DERIVATIVE_UNIT } from '../../../../common/constants';
import { formatUTCTimestampForTimezone } from '../../format_timezone';

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

export class KibanaTaskManagerMetric extends KibanaMetric {
  constructor(opts) {
    super(opts);

    this.getDateHistogramSubAggs = () => {
      const subAggs = this.types.reduce((accum, type) => {
        return {
          ...accum,
          [`metric_${type}`]: {
            filter: { term: { 'kibana_stats.task_manager.drift.by_type.alertType': type } },
            aggs: {
              metric: {
                [this.metricAgg]: { field: this.field },
              },
            },
          },
        };
      }, {});
      return subAggs;
    };

    this.resultHandler = (
      result,
      usableBuckets,
      metric,
      calculation,
      bucketSizeInSeconds,
      timezone
    ) => {
      const list = this.types.map((type) => {
        return {
          ...result,
          metric: {
            ...metric,
            label: metric.label.replace('[alertType]', type),
            description: metric.description.replace('[alertType]', type),
          },
          data: usableBuckets.map((bucket) => {
            return [
              formatUTCTimestampForTimezone(bucket.key, timezone),
              calculation(bucket, `metric_${type}.metric.value`, metric, bucketSizeInSeconds),
            ];
          }),
        };
      });

      // TODO: this isn't what we want, but an example of how we can do stuff if need to
      if (metric.limit) {
        if (metric.limit.max) {
          const sumByLabel = reverse(
            sortBy(
              list.reduce((accum, item) => {
                return [
                  ...accum,
                  {
                    label: item.metric.label,
                    sum: item.data.reduce((sum, [_timestamp, value]) => sum + value, 0), // eslint-disable-line no-unused-vars
                  },
                ];
              }, []),
              'sum'
            )
          ).slice(0, metric.limit.max);
          return list.filter((item) => sumByLabel.find(({ label }) => item.metric.label === label));
        }
      }

      return list;
    };
  }

  async before(req, indexPattern, query) {
    const params = {
      index: indexPattern,
      size: 0,
      ignoreUnavailable: true,
      filterPath: ['aggregations.types.buckets'],
      body: {
        query,
        aggs: {
          types: {
            terms: {
              field: 'kibana_stats.task_manager.drift.by_type.alertType',
              size: 1000, // TODO: how to paginate properly here
            },
          },
        },
      },
    };
    const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
    const alertTypeResponse = await callWithRequest(req, 'search', params);
    const types = get(alertTypeResponse, 'aggregations.types.buckets', []).map((type) => type.key);
    this.types = types;
  }
}
