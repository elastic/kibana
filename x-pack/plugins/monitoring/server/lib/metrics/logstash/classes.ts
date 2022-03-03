/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { ClusterMetric, Metric, MetricOptions } from '../classes';
import { LARGE_FLOAT } from '../../../../common/formatting';
import { NORMALIZED_DERIVATIVE_UNIT } from '../../../../common/constants';

const msTimeUnitLabel = i18n.translate('xpack.monitoring.metrics.logstash.msTimeUnitLabel', {
  defaultMessage: 'ms',
});
const perSecondUnitLabel = i18n.translate('xpack.monitoring.metrics.logstash.perSecondUnitLabel', {
  defaultMessage: '/s',
});

type LogstashClusterMetricOptions = Pick<
  MetricOptions,
  'field' | 'label' | 'description' | 'format' | 'metricAgg' | 'units'
> &
  Partial<Pick<MetricOptions, 'title' | 'derivative'>>;

export class LogstashClusterMetric extends ClusterMetric {
  constructor(opts: LogstashClusterMetricOptions) {
    super({
      ...opts,
      app: 'logstash',
      ...LogstashClusterMetric.getMetricFields(),
    });
  }

  static getMetricFields() {
    return {
      uuidField: 'cluster_uuid',
      timestampField: 'logstash_stats.timestamp',
    };
  }
}

type LogstashEventsLatencyClusterMetricOptions = Pick<
  MetricOptions,
  'field' | 'label' | 'description'
>;

export class LogstashEventsLatencyClusterMetric extends LogstashClusterMetric {
  constructor(opts: LogstashEventsLatencyClusterMetricOptions) {
    super({
      ...opts,
      format: LARGE_FLOAT,
      metricAgg: 'max',
      units: msTimeUnitLabel,
    });

    this.aggs = {
      logstash_uuids: {
        terms: {
          field: 'logstash_stats.logstash.uuid',
          size: 1000,
        },
        aggs: {
          events_time_in_millis_per_node: {
            max: {
              field: 'logstash_stats.events.duration_in_millis',
            },
          },
          events_total_per_node: {
            max: {
              field: 'logstash_stats.events.out',
            },
          },
        },
      },
      events_time_in_millis: {
        sum_bucket: {
          buckets_path: 'logstash_uuids>events_time_in_millis_per_node',
          gap_policy: 'skip',
        },
      },
      events_total: {
        sum_bucket: {
          buckets_path: 'logstash_uuids>events_total_per_node',
          gap_policy: 'skip',
        },
      },
      events_time_in_millis_deriv: {
        derivative: {
          buckets_path: 'events_time_in_millis',
          gap_policy: 'skip',
          unit: NORMALIZED_DERIVATIVE_UNIT,
        },
      },
      events_total_deriv: {
        derivative: {
          buckets_path: 'events_total',
          gap_policy: 'skip',
          unit: NORMALIZED_DERIVATIVE_UNIT,
        },
      },
    };
  }

  public calculation = (bucket: object) => {
    const timeInMillisDeriv = _.get(bucket, 'events_time_in_millis_deriv.normalized_value', null);
    const totalEventsDeriv = _.get(bucket, 'events_total_deriv.normalized_value', null);

    return Metric.calculateLatency(timeInMillisDeriv, totalEventsDeriv);
  };
}

type LogstashEventsRateClusterMetricOptions = Pick<
  MetricOptions,
  'field' | 'label' | 'description'
>;

export class LogstashEventsRateClusterMetric extends LogstashClusterMetric {
  constructor(opts: LogstashEventsRateClusterMetricOptions) {
    super({
      ...opts,
      derivative: true,
      format: LARGE_FLOAT,
      metricAgg: 'max',
      units: perSecondUnitLabel,
    });

    this.aggs = {
      logstash_uuids: {
        terms: {
          field: 'logstash_stats.logstash.uuid',
          size: 1000,
        },
        aggs: {
          event_rate_per_node: {
            max: {
              field: this.field,
            },
          },
        },
      },
      event_rate: {
        sum_bucket: {
          buckets_path: 'logstash_uuids>event_rate_per_node',
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

type LogstashMetricOptions = Pick<
  MetricOptions,
  'field' | 'label' | 'description' | 'units' | 'derivative' | 'metricAgg' | 'format'
> &
  Partial<Pick<MetricOptions, 'title' | 'format'>>;

export class LogstashMetric extends Metric {
  constructor(opts: LogstashMetricOptions) {
    super({
      ...opts,
      app: 'logstash',
      ...LogstashMetric.getMetricFields(),
    });
  }

  static getMetricFields() {
    return {
      uuidField: 'logstash_stats.logstash.uuid',
      timestampField: 'logstash_stats.timestamp',
    };
  }
}

type LogstashEventsLatencyMetricOptions = Pick<MetricOptions, 'field' | 'label' | 'description'>;

export class LogstashEventsLatencyMetric extends LogstashMetric {
  constructor(opts: LogstashEventsLatencyMetricOptions) {
    super({
      ...opts,
      format: LARGE_FLOAT,
      metricAgg: 'sum',
      units: msTimeUnitLabel,
    });

    this.aggs = {
      events_time_in_millis: {
        max: { field: 'logstash_stats.events.duration_in_millis' },
      },
      events_total: {
        max: { field: 'logstash_stats.events.out' },
      },
      events_time_in_millis_deriv: {
        derivative: {
          buckets_path: 'events_time_in_millis',
          gap_policy: 'skip',
          unit: NORMALIZED_DERIVATIVE_UNIT,
        },
      },
      events_total_deriv: {
        derivative: {
          buckets_path: 'events_total',
          gap_policy: 'skip',
          unit: NORMALIZED_DERIVATIVE_UNIT,
        },
      },
    };
    this.calculation = (bucket: object) => {
      const timeInMillisDeriv = _.get(bucket, 'events_time_in_millis_deriv.normalized_value', null);
      const totalEventsDeriv = _.get(bucket, 'events_total_deriv.normalized_value', null);

      return Metric.calculateLatency(timeInMillisDeriv, totalEventsDeriv);
    };
  }
}

type LogstashEventsRateMetricOptions = Pick<MetricOptions, 'field' | 'label' | 'description'>;

export class LogstashEventsRateMetric extends LogstashMetric {
  constructor(opts: LogstashEventsRateMetricOptions) {
    super({
      ...opts,
      derivative: true,
      format: LARGE_FLOAT,
      metricAgg: 'max',
      units: perSecondUnitLabel,
    });
  }
}

type LogstashPipelineQueueSizeMetricOptions = Pick<
  MetricOptions,
  'field' | 'label' | 'description' | 'format' | 'units'
> &
  Partial<Pick<MetricOptions, 'title'>>;

export class LogstashPipelineQueueSizeMetric extends LogstashMetric {
  constructor(opts: LogstashPipelineQueueSizeMetricOptions) {
    super({ ...opts });

    this.dateHistogramSubAggs = {
      pipelines: {
        nested: {
          path: 'logstash_stats.pipelines',
        },
        aggs: {
          pipeline_by_id: {
            terms: {
              field: 'logstash_stats.pipelines.id',
              size: 1000,
            },
            aggs: {
              queue_size_field: {
                max: {
                  field: this.field,
                },
              },
            },
          },
          total_queue_size_for_node: {
            sum_bucket: {
              buckets_path: 'pipeline_by_id>queue_size_field',
            },
          },
        },
      },
    };
    this.calculation = (bucket: object) => {
      return _.get(bucket, 'pipelines.total_queue_size_for_node.value');
    };
  }
}

type LogstashPipelineThroughputMetricOptions = Pick<
  MetricOptions,
  'field' | 'label' | 'description' | 'format' | 'units'
> &
  Partial<Pick<MetricOptions, 'uuidField'>> & {
    mbField?: string;
  };

export class LogstashPipelineThroughputMetric extends LogstashMetric {
  constructor(opts: LogstashPipelineThroughputMetricOptions) {
    super({
      ...opts,
      derivative: true,
    });

    this.getDateHistogramSubAggs = ({
      pipeline,
    }: {
      pipeline: { uuids: string[]; id: string };
    }) => {
      return {
        metric_deriv: {
          derivative: {
            buckets_path: 'sum',
            gap_policy: 'skip',
            unit: NORMALIZED_DERIVATIVE_UNIT,
          },
        },
        metric_mb_deriv: {
          derivative: {
            buckets_path: 'sum_mb',
            gap_policy: 'skip',
            unit: NORMALIZED_DERIVATIVE_UNIT,
          },
        },
        sum: {
          sum_bucket: {
            buckets_path: 'by_node_id>nest>pipeline>events_stats',
          },
        },
        sum_mb: {
          sum_bucket: {
            buckets_path: 'by_node_id>nest_mb>pipeline>events_stats',
          },
        },
        by_node_id: {
          terms: {
            field: 'logstash_stats.logstash.uuid',
            size: 1000,
            include: pipeline.uuids,
          },
          aggs: {
            nest: {
              nested: {
                path: 'logstash_stats.pipelines',
              },
              aggs: {
                pipeline: {
                  filter: {
                    term: {
                      'logstash_stats.pipelines.id': pipeline.id,
                    },
                  },
                  aggs: {
                    events_stats: {
                      max: {
                        field: this.field,
                      },
                    },
                  },
                },
              },
            },
            nest_mb: {
              nested: {
                path: 'logstash.node.stats.pipelines',
              },
              aggs: {
                pipeline: {
                  filter: {
                    term: {
                      'logstash.node.stats.pipelines.id': pipeline.id,
                    },
                  },
                  aggs: {
                    events_stats: {
                      max: {
                        field: this.mbField,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };
    };
  }
}

type LogstashPipelineNodeCountMetricOptions = Pick<
  MetricOptions,
  'field' | 'label' | 'description' | 'format' | 'units'
> &
  Partial<Pick<MetricOptions, 'uuidField'>>;

export class LogstashPipelineNodeCountMetric extends LogstashMetric {
  constructor(opts: LogstashPipelineNodeCountMetricOptions) {
    super({
      ...opts,
      derivative: false,
    });

    this.getDateHistogramSubAggs = ({
      pageOfPipelines,
    }: {
      pageOfPipelines: Array<{ id: string }>;
    }) => {
      const termAggExtras: {
        include: string[];
      } = {
        include: [],
      };

      if (pageOfPipelines) {
        termAggExtras.include = pageOfPipelines.map((pipeline) => pipeline.id);
      }
      return {
        pipelines_nested: {
          nested: {
            path: 'logstash_stats.pipelines',
          },
          aggs: {
            by_pipeline_id: {
              terms: {
                field: 'logstash_stats.pipelines.id',
                size: 1000,
                ...termAggExtras,
              },
              aggs: {
                to_root: {
                  reverse_nested: {},
                  aggs: {
                    node_count: {
                      cardinality: {
                        field: this.field,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        pipelines_mb_nested: {
          nested: {
            path: 'logstash.node.stats.pipelines',
          },
          aggs: {
            by_pipeline_id: {
              terms: {
                field: 'logstash.node.stats.pipelines.id',
                size: 1000,
                ...termAggExtras,
              },
              aggs: {
                to_root: {
                  reverse_nested: {},
                  aggs: {
                    node_count: {
                      cardinality: {
                        field: this.field,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };
    };

    this.calculation = (bucket: object) => {
      const pipelineNodesCounts: any = {};
      const legacyPipelineBuckets = _.get(bucket, 'pipelines_nested.by_pipeline_id.buckets', []);
      const mbPiplineBuckets = _.get(bucket, 'pipelines_mb_nested.by_pipeline_id.buckets', []);
      const pipelineBuckets = legacyPipelineBuckets.length
        ? legacyPipelineBuckets
        : mbPiplineBuckets;
      pipelineBuckets.forEach((pipelineBucket: any) => {
        pipelineNodesCounts[pipelineBucket.key] = _.get(pipelineBucket, 'to_root.node_count.value');
      });

      return pipelineNodesCounts;
    };
  }
}
