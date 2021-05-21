/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { sortBy, reverse, get } from 'lodash';
import { ClusterMetric, Metric } from '../classes';
import { NORMALIZED_DERIVATIVE_UNIT } from '../../../../common/constants';
import { formatUTCTimestampForTimezone } from '../../format_timezone';
import { getAlertTypes } from '../../kibana/task_manager';

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

    this.dateHistogramSubAggs = {
      nest: {
        nested: {
          path: 'kibana_stats.task_manager.drift.by_type',
        },
        aggs: {
          types: {
            terms: {
              field: 'kibana_stats.task_manager.drift.by_type.alertType',
              size: 1000,
            },
            aggs: {
              metric: {
                max: {
                  field: this.field,
                },
              },
            },
          },
        },
      },
    };

    this.resultHandler = (
      result,
      usableBuckets,
      metric,
      calculation,
      bucketSizeInSeconds,
      timezone
    ) => {
      const sumByType = usableBuckets.reduce((accum, usableBucket) => {
        for (const bucket of get(usableBucket, 'nest.types.buckets', [])) {
          accum[bucket.key] = accum[bucket.key] || {
            sum: 0,
            alertType: bucket.key,
          };
          accum[bucket.key].sum += get(bucket, 'metric.value', 0);
        }
        return accum;
      }, {});
      const descOrdered = sortBy(sumByType, 'sum').reverse();
      const top = descOrdered.slice(0, Math.min(5, descOrdered.length));

      return top.map(({ alertType }) => {
        const data = usableBuckets.reduce((accum, usableBucket) => {
          for (const bucket of get(usableBucket, 'nest.types.buckets', [])) {
            if (bucket.key === alertType) {
              accum.push([
                formatUTCTimestampForTimezone(usableBucket.key, timezone),
                calculation(bucket, `metric.value`, metric, bucketSizeInSeconds),
              ]);
            }
          }
          return accum;
        }, []);
        return {
          ...result,
          metric: {
            ...metric,
            label: metric.label.replace('[alertType]', alertType),
            description: metric.description.replace('[alertType]', alertType),
          },
          data,
        };
      });
    };
  }
}

export class KibanaSingleTaskManagerMetric extends KibanaMetric {
  constructor(opts) {
    super(opts);

    this.dateHistogramSubAggs = {
      nest: {
        nested: {
          path: 'kibana_stats.task_manager.drift.by_type',
        },
        aggs: {
          metric: {
            max: {
              field: this.field,
            },
          },
        },
      },
    };

    this.calculation = (bucket) => get(bucket, 'nest.metric.value', null);
  }
}

export class KibanaTaskManagerMetric2 extends KibanaMetric {
  constructor(opts) {
    super(opts);

    if (!opts.by_alert_type) {
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
    }

    this.resultHandler = (
      result,
      usableBuckets,
      metric,
      calculation,
      bucketSizeInSeconds,
      timezone
    ) => {
      if (opts.by_alert_type) {
        return {
          ...result,
          metric: {
            ...metric,
            label: metric.label.replace('[alertType]', opts.by_alert_type),
            description: metric.description.replace('[alertType]', opts.by_alert_type),
          },
          data: usableBuckets.map((bucket) => [
            formatUTCTimestampForTimezone(bucket.key, timezone),
            calculation(bucket, `metric.value`, metric, bucketSizeInSeconds),
          ]), // map buckets to X/Y coords for Flot charting
        };
      }

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
    const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
    const callCluster = async (endpoint, params) => {
      return await callWithRequest(req, endpoint, params);
    };

    this.types = await getAlertTypes(callCluster, indexPattern, {
      clusterUuid: req.params.clusterUuid,
      query,
    });
  }
}
