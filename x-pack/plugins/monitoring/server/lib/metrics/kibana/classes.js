/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { sortBy, get } from 'lodash';
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

    this.dateHistogramSubAggs = {
      nest: {
        nested: {
          path: 'kibana_stats.task_manager.drift.by_type',
        },
        aggs: {
          types: {
            terms: {
              field: 'kibana_stats.task_manager.drift.by_type.alert_type',
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
