/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { Metric, MetricOptions } from '../classes';
import { LARGE_FLOAT, SMALL_FLOAT, SMALL_BYTES } from '../../../../common/formatting';
import { NORMALIZED_DERIVATIVE_UNIT } from '../../../../common/constants';

type ElasticsearchMetricOptions = Pick<
  MetricOptions,
  'format' | 'metricAgg' | 'field' | 'label' | 'description' | 'units' | 'derivative'
> &
  Partial<Pick<MetricOptions, 'title'>> & { type: string; min?: number };

export class ElasticsearchMetric extends Metric {
  constructor(opts: ElasticsearchMetricOptions) {
    super({
      ...opts,
      app: 'elasticsearch',
      uuidField: 'source_node.uuid',
      timestampField: 'timestamp',
    });

    this.checkRequiredParams({ type: opts.type });
  }

  static getMetricFields() {
    return {
      uuidField: 'source_node.uuid', // ???
      timestampField: 'timestamp',
    };
  }
}

type DifferenceMetricOptions = Pick<
  MetricOptions,
  'description' | 'format' | 'metricAgg' | 'units' | 'label' | 'title'
> & {
  type: string;
  fieldSource: string;
  metric: string;
  metric2: string;
};

export class DifferenceMetric extends ElasticsearchMetric {
  constructor({ fieldSource, metric, metric2, ...opts }: DifferenceMetricOptions) {
    super({
      ...opts,
      field: '', // NOTE: this is not used for this
      format: LARGE_FLOAT,
      metricAgg: 'sum', // NOTE: this is used for a pointless aggregation
    });

    this.checkRequiredParams({
      metric,
      metric2,
    });

    this.aggs = {
      metric_max: {
        max: { field: `${fieldSource}.${metric}` },
      },
      metric2_max: {
        max: { field: `${fieldSource}.${metric2}` },
      },
    };

    this.getFields = () => [`${fieldSource}.${metric}`, `${fieldSource}.${metric2}`];

    this.calculation = (bucket: object) => {
      return _.get(bucket, 'metric_max.value') - _.get(bucket, 'metric2_max.value');
    };
  }
}

type LatencyMetricOptions = Pick<MetricOptions, 'field' | 'label' | 'description'> &
  Partial<Pick<MetricOptions, 'title'>> & {
    type: string;
    fieldSource: string;
    metric: string;
  };

export class LatencyMetric extends ElasticsearchMetric {
  constructor({ metric, fieldSource, ...opts }: LatencyMetricOptions) {
    super({
      ...opts,
      format: LARGE_FLOAT,
      metricAgg: 'sum', // NOTE: this is used for a pointless aggregation
      units: i18n.translate('xpack.monitoring.metrics.es.msTimeUnitLabel', {
        defaultMessage: 'ms',
      }),
    });

    this.checkRequiredParams({
      metric,
      fieldSource,
    });

    let metricField;
    if (metric === 'index') {
      metricField = 'indexing.index';
    } else if (metric === 'query') {
      metricField = 'search.query';
    } else {
      throw new Error(
        i18n.translate('xpack.monitoring.metrics.es.latencyMetricParamErrorMessage', {
          defaultMessage: 'Latency metric param must be a string equal to `index` or `query`',
        })
      );
    }

    const timeInMillisField = `${fieldSource}.${metricField}_time_in_millis`;
    const eventTotalField = `${fieldSource}.${metricField}_total`;

    this.aggs = {
      event_time_in_millis: {
        max: { field: timeInMillisField },
      },
      event_total: {
        max: { field: eventTotalField },
      },
      event_time_in_millis_deriv: {
        derivative: {
          buckets_path: 'event_time_in_millis',
          gap_policy: 'skip',
          unit: NORMALIZED_DERIVATIVE_UNIT,
        },
      },
      event_total_deriv: {
        derivative: {
          buckets_path: 'event_total',
          gap_policy: 'skip',
          unit: NORMALIZED_DERIVATIVE_UNIT,
        },
      },
    };

    this.calculation = (bucket: object) => {
      const timeInMillisDeriv = _.get(bucket, 'event_time_in_millis_deriv.normalized_value', null);
      const totalEventsDeriv = _.get(bucket, 'event_total_deriv.normalized_value', null);

      return Metric.calculateLatency(timeInMillisDeriv, totalEventsDeriv);
    };
  }
}

type RequestRateMetricOptions = Pick<MetricOptions, 'field' | 'label' | 'description'> &
  Partial<Pick<MetricOptions, 'format' | 'units' | 'derivative' | 'title'>> & {
    type: string;
  };
export class RequestRateMetric extends ElasticsearchMetric {
  constructor(opts: RequestRateMetricOptions) {
    super({
      ...opts,
      derivative: true,
      format: LARGE_FLOAT,
      metricAgg: 'max',
      units: i18n.translate('xpack.monitoring.metrics.es.perSecondsUnitLabel', {
        defaultMessage: '/s',
      }),
    });
  }
}

type ThreadPoolQueueMetricOptions = Pick<MetricOptions, 'field' | 'label' | 'description'> &
  Partial<Pick<MetricOptions, 'title'>>;
export class ThreadPoolQueueMetric extends ElasticsearchMetric {
  constructor(opts: ThreadPoolQueueMetricOptions) {
    super({
      ...opts,
      title: 'Thread Queue',
      type: 'node',
      format: SMALL_FLOAT,
      metricAgg: 'max',
      units: '',
    });
  }
}

type ThreadPoolRejectedMetricOptions = Pick<MetricOptions, 'field' | 'label' | 'description'> &
  Partial<Pick<MetricOptions, 'title'>>;

export class ThreadPoolRejectedMetric extends ElasticsearchMetric {
  constructor(opts: ThreadPoolRejectedMetricOptions) {
    super({
      ...opts,
      title: 'Thread Rejections',
      type: 'node',
      derivative: true,
      format: SMALL_FLOAT,
      metricAgg: 'max',
      units: '',
    });
  }
}

/**
 * A generic {@code class} for collecting Index Memory metrics.
 *
 * @see IndicesMemoryMetric
 * @see NodeIndexMemoryMetric
 * @see SingleIndexMemoryMetric
 */

type IndexMemoryMetricOptions = Pick<MetricOptions, 'field' | 'label' | 'description'> &
  Partial<Pick<MetricOptions, 'title'>> & { type: string };
export class IndexMemoryMetric extends ElasticsearchMetric {
  constructor(opts: IndexMemoryMetricOptions) {
    super({
      title: 'Index Memory',
      ...opts,
      format: SMALL_BYTES,
      metricAgg: 'max',
      units: 'B',
    });
  }
}

type NodeIndexMemoryMetricOptions = Pick<MetricOptions, 'field' | 'label' | 'description'> &
  Partial<Pick<MetricOptions, 'title'>>;

export class NodeIndexMemoryMetric extends IndexMemoryMetric {
  constructor(opts: NodeIndexMemoryMetricOptions) {
    super({
      ...opts,
      type: 'node',
    });

    // override the field set by the super constructor
    this.field = 'node_stats.indices.segments.' + opts.field;
  }
}

type IndicesMemoryMetricOptions = Pick<MetricOptions, 'field' | 'label' | 'description'> &
  Partial<Pick<MetricOptions, 'title'>>;

export class IndicesMemoryMetric extends IndexMemoryMetric {
  constructor(opts: IndicesMemoryMetricOptions) {
    super({
      ...opts,
      type: 'cluster',
    });

    // override the field set by the super constructor
    this.field = 'index_stats.total.segments.' + opts.field;
  }
}

type SingleIndexMemoryMetricOptions = Pick<MetricOptions, 'field' | 'label' | 'description'> &
  Partial<Pick<MetricOptions, 'title'>>;

export class SingleIndexMemoryMetric extends IndexMemoryMetric {
  constructor(opts: SingleIndexMemoryMetricOptions) {
    super({
      ...opts,
      type: 'index',
    });

    // override the field set by the super constructor
    this.field = 'index_stats.total.segments.' + opts.field;
  }
}

type WriteThreadPoolQueueMetricOptions = Pick<MetricOptions, 'label' | 'description'> &
  Partial<Pick<MetricOptions, 'title'>>;

export class WriteThreadPoolQueueMetric extends ElasticsearchMetric {
  constructor(opts: WriteThreadPoolQueueMetricOptions) {
    super({
      ...opts,
      field: 'node_stats.thread_pool.write.queue', // in 7.0, we can only check for this threadpool
      type: 'node',
      format: SMALL_FLOAT,
      metricAgg: 'max',
      units: '',
    });

    this.dateHistogramSubAggs = {
      index: {
        max: { field: 'node_stats.thread_pool.index.queue' },
      },
      bulk: {
        max: { field: 'node_stats.thread_pool.bulk.queue' },
      },
      write: {
        max: { field: 'node_stats.thread_pool.write.queue' },
      },
    };
    this.calculation = (bucket: object) => {
      const index = _.get(bucket, 'index.value', null);
      const bulk = _.get(bucket, 'bulk.value', null);
      const write = _.get(bucket, 'write.value', null);

      if (index !== null || bulk !== null || write !== null) {
        return (index || 0) + (bulk || 0) + (write || 0);
      }

      // ignore the data if none of them exist
      return null;
    };
  }
}

type WriteThreadPoolRejectedMetricOptions = Pick<
  MetricOptions,
  'label' | 'description' | 'field' | 'title'
>;

export class WriteThreadPoolRejectedMetric extends ElasticsearchMetric {
  constructor(opts: WriteThreadPoolRejectedMetricOptions) {
    super({
      ...opts,
      field: 'node_stats.thread_pool.write.rejected', // in 7.0, we can only check for this threadpool
      type: 'node',
      format: SMALL_FLOAT,
      metricAgg: 'max',
      units: '',
    });

    this.dateHistogramSubAggs = {
      index_rejections: {
        max: { field: 'node_stats.thread_pool.index.rejected' },
      },
      bulk_rejections: {
        max: { field: 'node_stats.thread_pool.bulk.rejected' },
      },
      write_rejections: {
        max: { field: 'node_stats.thread_pool.write.rejected' },
      },
      index_deriv: {
        derivative: {
          buckets_path: 'index_rejections',
          gap_policy: 'skip',
          unit: NORMALIZED_DERIVATIVE_UNIT,
        },
      },
      bulk_deriv: {
        derivative: {
          buckets_path: 'bulk_rejections',
          gap_policy: 'skip',
          unit: NORMALIZED_DERIVATIVE_UNIT,
        },
      },
      write_deriv: {
        derivative: {
          buckets_path: 'write_rejections',
          gap_policy: 'skip',
          unit: NORMALIZED_DERIVATIVE_UNIT,
        },
      },
    };
    this.calculation = (bucket: object) => {
      const index = _.get(bucket, 'index_deriv.normalized_value', null);
      const bulk = _.get(bucket, 'bulk_deriv.normalized_value', null);
      const write = _.get(bucket, 'write_deriv.normalized_value', null);

      if (index !== null || bulk !== null || write !== null) {
        const valueOrZero = (value: number) => (value < 0 ? 0 : value || 0);

        return valueOrZero(index) + valueOrZero(bulk) + valueOrZero(write);
      }

      // ignore the data if none of them exist
      return null;
    };
  }
}

type MillisecondsToSecondsMetricOptions = Pick<
  MetricOptions,
  'label' | 'description' | 'field' | 'title' | 'format' | 'metricAgg' | 'units'
> & { type: string };

export class MillisecondsToSecondsMetric extends ElasticsearchMetric {
  constructor(opts: MillisecondsToSecondsMetricOptions) {
    super({
      ...opts,
      units: i18n.translate('xpack.monitoring.metrics.es.secondsUnitLabel', {
        defaultMessage: 's',
      }),
    });
    this.calculation = (bucket: object) => {
      return _.get(bucket, 'metric.value') / 1000;
    };
  }
}
