/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { QuotaMetric } from '../classes';
import {
  LogstashEventsRateClusterMetric,
  LogstashEventsLatencyClusterMetric,
  LogstashEventsRateMetric,
  LogstashEventsLatencyMetric,
  LogstashMetric,
  LogstashPipelineQueueSizeMetric,
  LogstashPipelineThroughputMetric,
  LogstashPipelineNodeCountMetric
} from './classes';
import {
  LARGE_FLOAT,
  LARGE_BYTES,
  SMALL_BYTES,
  LARGE_ABBREVIATED
} from '../../../../common/formatting';

export const metrics = {
  logstash_cluster_events_input_rate: new LogstashEventsRateClusterMetric({
    field: 'logstash_stats.events.in',
    label: 'Events Received Rate',
    description:
      'Number of events received per second by all Logstash nodes at the inputs stage.'
  }),
  logstash_cluster_events_output_rate: new LogstashEventsRateClusterMetric({
    field: 'logstash_stats.events.out',
    label: 'Events Emitted Rate',
    description:
      'Number of events emitted per second by all Logstash nodes at the outputs stage.'
  }),
  logstash_cluster_events_latency: new LogstashEventsLatencyClusterMetric({
    field: 'logstash_stats.events.out',
    label: 'Event Latency',
    description:
      'Average time spent by events in the filter and output stages, which is the total ' +
      'time it takes to process events divided by number of events emitted.'
  }),
  logstash_events_input_rate: new LogstashEventsRateMetric({
    field: 'logstash_stats.events.in',
    label: 'Events Received Rate',
    description:
      'Number of events received per second by the Logstash node at the inputs stage.'
  }),
  logstash_events_output_rate: new LogstashEventsRateMetric({
    field: 'logstash_stats.events.out',
    label: 'Events Emitted Rate',
    description:
      'Number of events emitted per second by the Logstash node at the outputs stage.'
  }),
  logstash_events_latency: new LogstashEventsLatencyMetric({
    field: 'logstash_stats.events.out',
    label: 'Event Latency',
    description:
      'Average time spent by events in the filter and output stages, which is the total ' +
      'time it takes to process events divided by number of events emitted.'
  }),
  logstash_os_load_1m: new LogstashMetric({
    title: 'System Load',
    field: 'logstash_stats.os.cpu.load_average.1m',
    label: '1m',
    description: 'Load average over the last minute.',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: ''
  }),
  logstash_os_load_5m: new LogstashMetric({
    title: 'System Load',
    field: 'logstash_stats.os.cpu.load_average.5m',
    label: '5m',
    description: 'Load average over the last 5 minutes.',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: ''
  }),
  logstash_os_load_15m: new LogstashMetric({
    title: 'System Load',
    field: 'logstash_stats.os.cpu.load_average.15m',
    label: '15m',
    description: 'Load average over the last 15 minutes.',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: ''
  }),
  logstash_node_jvm_mem_max_in_bytes: new LogstashMetric({
    field: 'logstash_stats.jvm.mem.heap_max_in_bytes',
    title: 'JVM Heap',
    label: 'Max Heap',
    description: 'Total heap available to Logstash running in the JVM.',
    format: SMALL_BYTES,
    metricAgg: 'max',
    units: 'B'
  }),
  logstash_node_jvm_mem_used_in_bytes: new LogstashMetric({
    field: 'logstash_stats.jvm.mem.heap_used_in_bytes',
    title: 'JVM Heap',
    label: 'Used Heap',
    description: 'Total heap used by Logstash running in the JVM.',
    format: SMALL_BYTES,
    metricAgg: 'max',
    units: 'B'
  }),
  logstash_node_cpu_utilization: new LogstashMetric({
    field: 'logstash_stats.process.cpu.percent',
    label: 'CPU Utilization',
    description:
      'Percentage of CPU usage reported by the OS (100% is the max).',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '%'
  }),
  logstash_node_cgroup_periods: new LogstashMetric({
    field: 'logstash_stats.os.cgroup.cpu.stat.number_of_elapsed_periods',
    title: 'Cgroup CFS Stats',
    label: 'Cgroup Elapsed Periods',
    description:
      'The number of sampling periods from the Completely Fair Scheduler (CFS). Compare against the number of times throttled.',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    derivative: true,
    units: ''
  }),
  logstash_node_cgroup_throttled: new LogstashMetric({
    field: 'logstash_stats.os.cgroup.cpu.stat.time_throttled_nanos',
    title: 'Cgroup CPU Performance',
    label: 'Cgroup Throttling',
    description:
      'The amount of throttled time, reported in nanoseconds, of the Cgroup.',
    format: LARGE_ABBREVIATED,
    metricAgg: 'max',
    derivative: true,
    units: 'ns'
  }),
  logstash_node_cgroup_throttled_count: new LogstashMetric({
    field: 'logstash_stats.os.cgroup.cpu.stat.number_of_times_throttled',
    title: 'Cgroup CFS Stats',
    label: 'Cgroup Throttled Count',
    description:
      'The number of times that the CPU was throttled by the Cgroup.',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    derivative: true,
    units: ''
  }),
  logstash_node_cgroup_usage: new LogstashMetric({
    field: 'logstash_stats.os.cgroup.cpuacct.usage_nanos',
    title: 'Cgroup CPU Performance',
    label: 'Cgroup Usage',
    description:
      'The usage, reported in nanoseconds, of the Cgroup. Compare this with the throttling to discover issues.',
    format: LARGE_ABBREVIATED,
    metricAgg: 'max',
    derivative: true,
    units: 'ns'
  }),
  ...(() => {
    // CGroup CPU Utilization Fields
    const quotaMetricConfig = {
      app: 'logstash',
      uuidField: 'logstash_stats.logstash.uuid',
      timestampField: 'logstash_stats.timestamp',
      fieldSource: 'logstash_stats.os.cgroup',
      usageField: 'cpuacct.usage_nanos',
      periodsField: 'cpu.stat.number_of_elapsed_periods',
      quotaField: 'cpu.cfs_quota_micros',
      field: 'logstash_stats.process.cpu.percent', // backup field if quota is not configured
      label: 'Cgroup CPU Utilization',
      description:
        'CPU Usage time compared to the CPU quota shown in percentage. If CPU ' +
        'quotas are not set, then no data will be shown.'
    };
    return {
      logstash_node_cgroup_quota: new QuotaMetric({
        ...quotaMetricConfig,
        title: 'CPU Utilization'
      }),
      logstash_node_cgroup_quota_as_cpu_utilization: new QuotaMetric({
        ...quotaMetricConfig,
        label: 'CPU Utilization' //  override the "Cgroup CPU..." label
      })
    };
  })(),
  logstash_queue_events_count: new LogstashMetric({
    field: 'logstash_stats.queue.events_count',
    label: 'Events Queued',
    title: 'Persistent Queue Events',
    description:
      'Average number of events in the persistent queue waiting to be processed by the filter and output stages.',
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: ''
  }),
  logstash_pipeline_queue_size: new LogstashPipelineQueueSizeMetric({
    field: 'logstash_stats.pipelines.queue.queue_size_in_bytes',
    label: 'Queue Size',
    description:
      'Current size of all persistent queues in the Logstash pipelines on this node.',
    title: 'Persistent Queue Size',
    format: LARGE_BYTES,
    units: 'B'
  }),
  logstash_pipeline_max_queue_size: new LogstashPipelineQueueSizeMetric({
    field: 'logstash_stats.pipelines.queue.max_queue_size_in_bytes',
    label: 'Max Queue Size',
    description: 'Maximum size set for the persistent queues on this node.',
    format: LARGE_BYTES,
    units: 'B'
  }),
  logstash_cluster_pipeline_throughput: new LogstashPipelineThroughputMetric({
    field: 'logstash_stats.pipelines.events.out',
    label: 'Pipeline Throughput',
    description:
      'Number of events emitted per second by the Logstash pipeline at the outputs stage.',
    format: LARGE_FLOAT,
    units: 'e/s'
  }),
  logstash_node_pipeline_throughput: new LogstashPipelineThroughputMetric({
    uuidField: 'logstash_stats.logstash.uuid', // TODO: add comment explaining why
    field: 'logstash_stats.pipelines.events.out',
    label: 'Pipeline Throughput',
    description:
      'Number of events emitted per second by the Logstash pipeline at the outputs stage.',
    format: LARGE_FLOAT,
    units: 'e/s'
  }),
  logstash_cluster_pipeline_nodes_count: new LogstashPipelineNodeCountMetric({
    field: 'logstash_stats.logstash.uuid',
    label: 'Pipeline Node Count',
    description: 'Number of nodes on which the Logstash pipeline is running.',
    format: LARGE_FLOAT,
    units: ''
  }),
  logstash_node_pipeline_nodes_count: new LogstashPipelineNodeCountMetric({
    uuidField: 'logstash_stats.logstash.uuid', // TODO: add comment explaining why
    field: 'logstash_stats.logstash.uuid',
    label: 'Pipeline Node Count',
    description: 'Number of nodes on which the Logstash pipeline is running.',
    format: LARGE_FLOAT,
    units: ''
  })
};
