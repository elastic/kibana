/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { MissingRequiredError } from '../error_missing_required';
import {
  LARGE_FLOAT,
  SMALL_FLOAT,
  SMALL_BYTES,
  LARGE_BYTES
} from '../../../common/formatting';
import { NORMALIZED_DERIVATIVE_UNIT } from '../../../common/constants';

/**
 * Calculate the latency, if any, for the {@code eventTimeInMillis} and {@code totalEvents}.
 *
 * @param  {Number} eventTimeInMillis        {@code null} if unknown. Time spent on the events
 * @param  {Number} totalEvents         {@code null} if unknown. Total number of events
 * @return {Number}                     {@code null} if unknown. Window size of the events in seconds
 */
function calculateLatency(timeInMillis, totalEvents) {
  if (timeInMillis === null || totalEvents === null) {
    return null;
  } else if (timeInMillis < 0 || totalEvents < 0) {
    // Negative values indicate blips in the data (e.g., restarting a node) that we do not want to misrepresent
    return null;
  } else if (totalEvents === 0) {
    return 0;
  }

  return timeInMillis / totalEvents;
}


export class Metric {
  constructor(opts) {
    const props = {
      derivative: false
    };

    const requireds = {
      field: opts.field,
      label: opts.label,
      description: opts.description,
      format: opts.format,
      units: opts.units,
      timestampField: opts.timestampField
    };
    this.checkRequiredParams(requireds);
    _.assign(this, _.defaults(opts, props));
  }

  checkRequiredParams(requireds) {
    const undefKey = _.findKey(requireds, _.isUndefined);
    if (undefKey) {
      console.log(`Missing required field: [${undefKey}]`);
      throw new MissingRequiredError(undefKey);
    }
  }

  toPlainObject() {
    return _.toPlainObject(this);
  }
}

export class ElasticsearchMetric extends Metric {
  constructor(opts) {
    super({
      ...opts,
      app: 'elasticsearch',
      uuidField: 'source_node.uuid',
      timestampField: 'timestamp'
    });

    this.checkRequiredParams({ type: opts.type });
  }

  // helper method
  static getMetricFields() {
    return {
      uuidField: 'source_node.uuid',
      timestampField: 'timestamp'
    };
  }
}

export class KibanaEventsRateClusterMetric extends Metric {
  constructor(opts) {
    super({
      ...opts,
      app: 'kibana',
      uuidField: 'cluster_uuid',
      timestampField: 'kibana_stats.timestamp',
      metricAgg: 'max'
    });

    this.aggs = {
      kibana_uuids: {
        terms: {
          field: 'kibana_stats.kibana.uuid',
          size: 1000
        },
        aggs: {
          event_rate_per_instance: {
            max: {
              field: this.field
            }
          }
        }
      },
      event_rate: {
        sum_bucket: {
          buckets_path: 'kibana_uuids>event_rate_per_instance',
          gap_policy: 'skip'
        }
      },
      metric_deriv: {
        derivative: {
          buckets_path: 'event_rate',
          gap_policy: 'skip',
          unit: NORMALIZED_DERIVATIVE_UNIT,
        }
      }
    };
  }

  // helper method
  static getMetricFields() {
    return {
      uuidField: 'cluster_uuid',
      timestampField: 'kibana_stats.timestamp'
    };
  }
}

export class KibanaMetric extends Metric {
  constructor(opts) {
    super({
      ...opts,
      app: 'kibana',
      uuidField: 'kibana_stats.kibana.uuid',
      timestampField: 'kibana_stats.timestamp'
    });
  }
}

export class LatencyMetric extends ElasticsearchMetric {
  constructor({ metric, fieldSource, ...opts }) {
    super({
      ...opts,
      format: LARGE_FLOAT,
      metricAgg: 'sum', // NOTE: this is used for a pointless aggregation
      units: 'ms'
    });

    this.checkRequiredParams({
      metric,
      fieldSource
    });

    let metricField;
    if (metric === 'index') {
      metricField = 'indexing.index';
    } else if (metric === 'query') {
      metricField = 'search.query';
    } else {
      throw new Error('Latency metric param must be a string equal to `index` or `query`');
    }

    const timeInMillisField = `${fieldSource}.${metricField}_time_in_millis`;
    const eventTotalField = `${fieldSource}.${metricField}_total`;

    this.aggs = {
      event_time_in_millis: {
        max: { field: timeInMillisField }
      },
      event_total: {
        max: { field: eventTotalField }
      },
      event_time_in_millis_deriv: {
        derivative: {
          buckets_path: 'event_time_in_millis',
          gap_policy: 'skip',
          unit: NORMALIZED_DERIVATIVE_UNIT
        }
      },
      event_total_deriv: {
        derivative: {
          buckets_path: 'event_total',
          gap_policy: 'skip',
          unit: NORMALIZED_DERIVATIVE_UNIT
        }
      }
    };

    this.calculation = (bucket, _key, _metric, _bucketSizeInSeconds) => {
      const timeInMillisDeriv = _.get(bucket, 'event_time_in_millis_deriv.normalized_value', null);
      const totalEventsDeriv = _.get(bucket, 'event_total_deriv.normalized_value', null);
      return calculateLatency(timeInMillisDeriv, totalEventsDeriv);
    };
  }
}

export class QuotaMetric extends Metric {
  constructor(opts) {
    super({
      ...opts,
      format: LARGE_FLOAT,
      metricAgg: 'max', // makes an average metric of `this.field`, which is the "actual cpu utilization"
      derivative: true,
      units: '%'
    });

    this.aggs = {
      usage: {
        max: { field: `${this.fieldSource}.${this.usageField}` }
      },
      periods: {
        max: { field: `${this.fieldSource}.${this.periodsField}` }
      },
      quota: {
        // Use min for this value. Basically equivalient to max, but picks -1
        // as the value if quota is disabled in one of the docs, which affects
        // the logic by routing to the non-quota scenario
        min: {
          field: `${this.fieldSource}.${this.quotaField}`
        }
      },
      usage_deriv: {
        derivative: {
          buckets_path: 'usage',
          gap_policy: 'skip',
          unit: NORMALIZED_DERIVATIVE_UNIT,
        }
      },
      periods_deriv: {
        derivative: {
          buckets_path: 'periods',
          gap_policy: 'skip',
          unit: NORMALIZED_DERIVATIVE_UNIT,
        }
      },
    };

    this.calculation = (bucket) => {

      const quota = _.get(bucket, 'quota.value');
      const deltaUsageDerivNormalizedValue = _.get(bucket, 'usage_deriv.normalized_value');
      const periodsDerivNormalizedValue = _.get(bucket, 'periods_deriv.normalized_value');

      if (deltaUsageDerivNormalizedValue && periodsDerivNormalizedValue && quota > 0) {
        // if throttling is configured
        const factor = deltaUsageDerivNormalizedValue / (periodsDerivNormalizedValue * quota * 1000); // convert quota from microseconds to nanoseconds by multiplying 1000
        return factor * 100; // convert factor to percentage

      }
      // if throttling is NOT configured, show nothing. The user should see that something is not configured correctly
      return null;

    };
  }

}

export class RequestRateMetric extends ElasticsearchMetric {

  constructor(opts) {
    super({
      ...opts,
      derivative: true,
      format: LARGE_FLOAT,
      metricAgg: 'max',
      units: '/s'
    });
  }

}

export class ThreadPoolQueueMetric extends ElasticsearchMetric {

  constructor(opts) {
    super({
      ...opts,
      title: 'Thread Queue',
      type: 'node',
      format: SMALL_FLOAT,
      metricAgg: 'max',
      units: ''
    });
  }

}

export class ThreadPoolRejectedMetric extends ElasticsearchMetric {

  constructor(opts) {
    super({
      ...opts,
      title: 'Thread Rejections',
      type: 'node',
      derivative: true,
      format: SMALL_FLOAT,
      metricAgg: 'max',
      units: ''
    });
  }

}

export class WriteThreadPoolQueueMetric extends ElasticsearchMetric {

  constructor(opts) {
    super({
      ...opts,
      field: 'node_stats.thread_pool.write.queue', // in 7.0, we can only check for this threadpool
      type: 'node',
      format: SMALL_FLOAT,
      metricAgg: 'max',
      units: ''
    });

    this.dateHistogramSubAggs = {
      index: {
        max: { field: 'node_stats.thread_pool.index.queue' }
      },
      bulk: {
        max: { field: 'node_stats.thread_pool.bulk.queue' }
      },
      write: {
        max: { field: 'node_stats.thread_pool.write.queue' }
      },
    };

    this.calculation = (bucket) => {
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

export class WriteThreadPoolRejectedMetric extends ElasticsearchMetric {

  constructor(opts) {
    super({
      ...opts,
      field: 'node_stats.thread_pool.write.rejected', // in 7.0, we can only check for this threadpool
      type: 'node',
      format: SMALL_FLOAT,
      metricAgg: 'max',
      units: ''
    });

    this.dateHistogramSubAggs = {
      index_rejections: {
        max: { field: 'node_stats.thread_pool.index.rejected' }
      },
      bulk_rejections: {
        max: { field: 'node_stats.thread_pool.bulk.rejected' }
      },
      write_rejections: {
        max: { field: 'node_stats.thread_pool.write.rejected' }
      },
      index_deriv: {
        derivative: {
          buckets_path: 'index_rejections',
          gap_policy: 'skip',
          unit: NORMALIZED_DERIVATIVE_UNIT,
        }
      },
      bulk_deriv: {
        derivative: {
          buckets_path: 'bulk_rejections',
          gap_policy: 'skip',
          unit: NORMALIZED_DERIVATIVE_UNIT,
        }
      },
      write_deriv: {
        derivative: {
          buckets_path: 'write_rejections',
          gap_policy: 'skip',
          unit: NORMALIZED_DERIVATIVE_UNIT,
        }
      },
    };

    this.calculation = (bucket) => {
      const index = _.get(bucket, 'index_deriv.normalized_value', null);
      const bulk = _.get(bucket, 'bulk_deriv.normalized_value', null);
      const write = _.get(bucket, 'write_deriv.normalized_value', null);

      if (index !== null || bulk !== null || write !== null) {
        const valueOrZero = value => value < 0 ? 0 : (value || 0);

        return valueOrZero(index) + valueOrZero(bulk) + valueOrZero(write);
      }

      // ignore the data if none of them exist
      return null;
    };
  }

}

/**
 * A generic {@code class} for collecting Index Memory metrics.
 *
 * @see IndicesMemoryMetric
 * @see NodeIndexMemoryMetric
 * @see SingleIndexMemoryMetric
 */
export class IndexMemoryMetric extends ElasticsearchMetric {

  constructor(opts) {
    super({
      title: 'Index Memory',
      ...opts,
      format: SMALL_BYTES,
      metricAgg: 'max',
      units: 'B'
    });
  }

}

export class NodeIndexMemoryMetric extends IndexMemoryMetric {

  constructor(opts) {
    super({
      ...opts,
      type: 'node'
    });

    // override the field set by the super constructor
    this.field = 'node_stats.indices.segments.' + opts.field;
  }

}

export class IndicesMemoryMetric extends IndexMemoryMetric {

  constructor(opts) {
    super({
      ...opts,
      type: 'cluster'
    });

    // override the field set by the super constructor
    this.field = 'index_stats.total.segments.' + opts.field;
  }

}

export class SingleIndexMemoryMetric extends IndexMemoryMetric {

  constructor(opts) {
    super({
      ...opts,
      type: 'index'
    });

    // override the field set by the super constructor
    this.field = 'index_stats.total.segments.' + opts.field;
  }

}

export class LogstashMetric extends Metric {

  constructor(opts) {
    super({
      ...opts,
      app: 'logstash',
      uuidField: 'logstash_stats.logstash.uuid',
      timestampField: 'logstash_stats.timestamp'
    });
  }

}

export class LogstashClusterMetric extends Metric {

  constructor(opts) {
    super({
      ...opts,
      app: 'logstash',
      timestampField: 'logstash_stats.timestamp'
    });
  }

  // helper method
  static getMetricFields() {
    return {
      timestampField: 'logstash_stats.timestamp'
    };
  }
}

export class LogstashEventsLatencyMetric extends LogstashMetric {

  constructor(opts) {
    super({
      ...opts,
      format: LARGE_FLOAT,
      metricAgg: 'sum',
      units: 'ms'
    });

    this.aggs = {
      events_time_in_millis: {
        max: { field: 'logstash_stats.events.duration_in_millis' }
      },
      events_total: {
        max: { field: 'logstash_stats.events.out' }
      },
      events_time_in_millis_deriv: {
        derivative: {
          buckets_path: 'events_time_in_millis',
          gap_policy: 'skip',
          unit: NORMALIZED_DERIVATIVE_UNIT,
        }
      },
      events_total_deriv: {
        derivative: {
          buckets_path: 'events_total',
          gap_policy: 'skip',
          unit: NORMALIZED_DERIVATIVE_UNIT,
        }
      }
    };

    this.calculation = (bucket, _key, _metric, _bucketSizeInSeconds) => {
      const timeInMillisDeriv = _.get(bucket, 'events_time_in_millis_deriv.normalized_value', null);
      const totalEventsDeriv = _.get(bucket, 'events_total_deriv.normalized_value', null);

      return calculateLatency(timeInMillisDeriv, totalEventsDeriv);
    };
  }

}

export class LogstashEventsLatencyClusterMetric extends LogstashClusterMetric {

  constructor(opts) {
    super({
      ...opts,
      format: LARGE_FLOAT,
      metricAgg: 'max',
      units: 'ms'
    });

    this.aggs = {
      logstash_uuids: {
        terms: {
          field: 'logstash_stats.logstash.uuid',
          size: 1000
        },
        aggs: {
          events_time_in_millis_per_node: {
            max: {
              field: 'logstash_stats.events.duration_in_millis'
            }
          },
          events_total_per_node: {
            max: {
              field: 'logstash_stats.events.out'
            }
          }
        }
      },
      events_time_in_millis: {
        sum_bucket: {
          buckets_path: 'logstash_uuids>events_time_in_millis_per_node',
          gap_policy: 'skip'
        }
      },
      events_total: {
        sum_bucket: {
          buckets_path: 'logstash_uuids>events_total_per_node',
          gap_policy: 'skip'
        }
      },
      events_time_in_millis_deriv: {
        derivative: {
          buckets_path: 'events_time_in_millis',
          gap_policy: 'skip',
          unit: NORMALIZED_DERIVATIVE_UNIT,
        }
      },
      events_total_deriv: {
        derivative: {
          buckets_path: 'events_total',
          gap_policy: 'skip',
          unit: NORMALIZED_DERIVATIVE_UNIT,
        }
      }
    };

    this.calculation = (bucket, _key, _metric, _bucketSizeInSeconds) => {
      const timeInMillisDeriv = _.get(bucket, 'events_time_in_millis_deriv.normalized_value', null);
      const totalEventsDeriv = _.get(bucket, 'events_total_deriv.normalized_value', null);

      return calculateLatency(timeInMillisDeriv, totalEventsDeriv);
    };
  }

}

export class LogstashEventsRateMetric extends LogstashMetric {

  constructor(opts) {
    super({
      ...opts,
      derivative: true,
      format: LARGE_FLOAT,
      metricAgg: 'max',
      units: '/s'
    });
  }

}

export class LogstashEventsRateClusterMetric extends LogstashClusterMetric {

  constructor(opts) {
    super({
      ...opts,
      derivative: true,
      format: LARGE_FLOAT,
      metricAgg: 'max',
      units: '/s'
    });

    this.aggs = {
      logstash_uuids: {
        terms: {
          field: 'logstash_stats.logstash.uuid',
          size: 1000
        },
        aggs: {
          event_rate_per_node: {
            max: {
              field: this.field
            }
          }
        }
      },
      event_rate: {
        sum_bucket: {
          buckets_path: 'logstash_uuids>event_rate_per_node',
          gap_policy: 'skip'
        }
      },
      metric_deriv: {
        derivative: {
          buckets_path: 'event_rate',
          gap_policy: 'skip',
          unit: NORMALIZED_DERIVATIVE_UNIT,
        }
      }
    };
  }

}

export class LogstashPipelineQueueSizeMetric extends LogstashMetric {
  constructor(opts) {
    super({ ...opts });

    this.dateHistogramSubAggs = {
      pipelines: {
        nested: {
          path: 'logstash_stats.pipelines'
        },
        aggs: {
          pipeline_by_id: {
            terms: {
              field: 'logstash_stats.pipelines.id',
              size: 1000
            },
            aggs: {
              queue_size_field: {
                max: {
                  field: this.field
                }
              }
            }
          },
          total_queue_size_for_node: {
            sum_bucket: {
              buckets_path: 'pipeline_by_id>queue_size_field'
            }
          }
        }
      }
    };

    this.calculation = bucket => _.get(bucket, 'pipelines.total_queue_size_for_node.value');
  }
}

export class LogstashPipelineThroughputMetric extends LogstashMetric {
  constructor(opts) {
    super({
      ...opts,
      derivative: false
    });

    this.dateHistogramSubAggs = {
      pipelines_nested: {
        nested: {
          path: 'logstash_stats.pipelines'
        },
        aggs: {
          by_pipeline_id: {
            terms: {
              field: 'logstash_stats.pipelines.id',
              size: 1000
            },
            aggs: {
              throughput: {
                sum_bucket: {
                  buckets_path: 'by_pipeline_hash>throughput'
                }
              },
              by_pipeline_hash: {
                terms: {
                  field: 'logstash_stats.pipelines.hash',
                  size: 1000
                },
                aggs: {
                  throughput: {
                    sum_bucket: {
                      buckets_path: 'by_ephemeral_id>throughput'
                    }
                  },
                  by_ephemeral_id: {
                    terms: {
                      field: 'logstash_stats.pipelines.ephemeral_id',
                      size: 1000
                    },
                    aggs: {
                      events_stats: {
                        stats: {
                          field: this.field
                        }
                      },
                      throughput: {
                        bucket_script: {
                          script: 'params.max - params.min',
                          buckets_path: {
                            min: 'events_stats.min',
                            max: 'events_stats.max'
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    this.calculation = (bucket, _key, _metric, bucketSizeInSeconds) => {
      const pipelineThroughputs = {};
      const pipelineBuckets = _.get(bucket, 'pipelines_nested.by_pipeline_id.buckets', []);
      pipelineBuckets.forEach(pipelineBucket => {
        pipelineThroughputs[pipelineBucket.key] =
          bucketSizeInSeconds ? _.get(pipelineBucket, 'throughput.value') / bucketSizeInSeconds : undefined;
      });

      return pipelineThroughputs;
    };
  }
}

export class LogstashPipelineNodeCountMetric extends LogstashMetric {
  constructor(opts) {
    super({
      ...opts,
      derivative: false
    });

    this.dateHistogramSubAggs = {
      pipelines_nested: {
        nested: {
          path: 'logstash_stats.pipelines'
        },
        aggs: {
          by_pipeline_id: {
            terms: {
              field: 'logstash_stats.pipelines.id',
              size: 1000
            },
            aggs: {
              to_root: {
                reverse_nested: {},
                aggs: {
                  node_count: {
                    cardinality: {
                      field: this.field
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    this.calculation = (bucket) => {
      const pipelineNodesCounts = {};
      const pipelineBuckets = _.get(bucket, 'pipelines_nested.by_pipeline_id.buckets', []);
      pipelineBuckets.forEach(pipelineBucket => {
        pipelineNodesCounts[pipelineBucket.key] = _.get(pipelineBucket, 'to_root.node_count.value');
      });

      return pipelineNodesCounts;
    };
  }
}

export class BeatsClusterMetric extends Metric {
  constructor(opts) {
    super({
      ...opts,
      app: 'beats',
      timestampField: 'beats_stats.timestamp',
      uuidField: 'cluster_uuid'
    });
  }

  // helper method
  static getMetricFields() {
    return {
      timestampField: 'beats_stats.timestamp'
    };
  }
}

export class BeatsEventsRateClusterMetric extends BeatsClusterMetric {
  constructor(opts) {
    super({
      ...opts,
      derivative: true,
      format: LARGE_FLOAT,
      metricAgg: 'max',
      units: '/s'
    });

    this.aggs = {
      beats_uuids: {
        terms: {
          field: 'beats_stats.beat.uuid',
          size: 10000
        },
        aggs: {
          event_rate_per_beat: {
            max: {
              field: this.field
            }
          }
        }
      },
      event_rate: {
        sum_bucket: {
          buckets_path: 'beats_uuids>event_rate_per_beat',
          gap_policy: 'skip'
        }
      },
      metric_deriv: {
        derivative: {
          buckets_path: 'event_rate',
          gap_policy: 'skip',
          unit: NORMALIZED_DERIVATIVE_UNIT,
        }
      }
    };
  }
}

export class BeatsByteRateClusterMetric extends BeatsEventsRateClusterMetric {
  constructor(opts) {
    super({
      ...opts,
      format: LARGE_BYTES
    });
  }
}

export class BeatsMetric extends Metric {
  constructor(opts) {
    super({
      ...opts,
      app: 'beats',
      uuidField: 'cluster_uuid',
      timestampField: 'beats_stats.timestamp'
    });
  }

  // helper method
  static getMetricFields() {
    return {
      uuidField: 'cluster_uuid',
      timestampField: 'beats_stats.timestamp'
    };
  }
}

export class BeatsEventsRateMetric extends BeatsMetric {
  constructor(opts) {
    super({
      ...opts,
      format: LARGE_FLOAT,
      metricAgg: 'max',
      units: '/s',
      derivative: true
    });
  }
}

export class BeatsByteRateMetric extends BeatsMetric {
  constructor(opts) {
    super({
      ...opts,
      format: LARGE_BYTES,
      metricAgg: 'max',
      units: '/s',
      derivative: true
    });
  }
}

export class BeatsCpuUtilizationMetric extends BeatsMetric {
  constructor(opts) {
    super({
      ...opts,
      format: SMALL_FLOAT,
      metricAgg: 'max',
      units: '%',
      derivative: true
    });

    /*
     * Convert a counter of milliseconds of utilization time into a percentage of the bucket size
     */
    this.calculation = ({ metric_deriv: metricDeriv } = {}, _key, _metric, bucketSizeInSeconds) => {
      if (metricDeriv) {
        const { normalized_value: metricDerivNormalizedValue } = metricDeriv;
        const bucketSizeInMillis = bucketSizeInSeconds * 1000;

        if (metricDerivNormalizedValue >= 0 && metricDerivNormalizedValue !== null) {
          return metricDerivNormalizedValue / bucketSizeInMillis * 100;
        }
      }
      return null;
    };
  }
}
