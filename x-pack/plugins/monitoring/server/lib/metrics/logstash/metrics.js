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
  LogstashPipelineNodeCountMetric,
} from './classes';
import {
  LARGE_FLOAT,
  LARGE_BYTES,
  SMALL_BYTES,
  LARGE_ABBREVIATED,
} from '../../../../common/formatting';
import { i18n } from '@kbn/i18n';

const instanceSystemLoadTitle = i18n.translate(
  'xpack.monitoring.metrics.logstash.systemLoadTitle',
  {
    defaultMessage: 'System Load',
  }
);
const instanceJvmHeapTitle = i18n.translate(
  'xpack.monitoring.metrics.logstashInstance.jvmHeapTitle',
  {
    defaultMessage: '{javaVirtualMachine} Heap',
    values: { javaVirtualMachine: 'JVM' },
  }
);
const instanceCpuUtilizationLabel = i18n.translate(
  'xpack.monitoring.metrics.logstashInstance.cpuUtilizationLabel',
  {
    defaultMessage: 'CPU Utilization',
  }
);
const instanceCgroupCfsStatsTitle = i18n.translate(
  'xpack.monitoring.metrics.logstashInstance.cgroupCfsStatsTitle',
  {
    defaultMessage: 'Cgroup CFS Stats',
  }
);
const instanceCgroupCpuPerformanceTitle = i18n.translate(
  'xpack.monitoring.metrics.logstashInstance.cgroupCpuPerformanceTitle',
  {
    defaultMessage: 'Cgroup CPU Performance',
  }
);
const pipelineThroughputLabel = i18n.translate(
  'xpack.monitoring.metrics.logstashInstance.pipelineThroughputLabel',
  {
    defaultMessage: 'Pipeline Throughput',
  }
);
const pipelineThroughputDescription = i18n.translate(
  'xpack.monitoring.metrics.logstashInstance.pipelineThroughputDescription',
  {
    defaultMessage:
      'Number of events emitted per second by the Logstash pipeline at the outputs stage.',
  }
);
const pipelineNodeCountLabel = i18n.translate(
  'xpack.monitoring.metrics.logstashInstance.pipelineNodeCountLabel',
  {
    defaultMessage: 'Pipeline Node Count',
  }
);
const pipelineNodeCountDescription = i18n.translate(
  'xpack.monitoring.metrics.logstashInstance.pipelineNodeCountDescription',
  {
    defaultMessage: 'Number of nodes on which the Logstash pipeline is running.',
  }
);
const nsTimeUnitLabel = i18n.translate('xpack.monitoring.metrics.logstash.nsTimeUnitLabel', {
  defaultMessage: 'ns',
});
const eventsPerSecondUnitLabel = i18n.translate(
  'xpack.monitoring.metrics.logstash.eventsPerSecondUnitLabel',
  {
    defaultMessage: 'e/s',
  }
);

export const metrics = {
  logstash_cluster_events_input_rate: new LogstashEventsRateClusterMetric({
    field: 'logstash_stats.events.in',
    label: i18n.translate('xpack.monitoring.metrics.logstash.eventsReceivedRateLabel', {
      defaultMessage: 'Events Received Rate',
    }),
    description: i18n.translate('xpack.monitoring.metrics.logstash.eventsReceivedRateDescription', {
      defaultMessage:
        'Number of events received per second by all Logstash nodes at the inputs stage.',
    }),
  }),
  logstash_cluster_events_output_rate: new LogstashEventsRateClusterMetric({
    field: 'logstash_stats.events.out',
    label: i18n.translate('xpack.monitoring.metrics.logstash.eventsEmittedRateLabel', {
      defaultMessage: 'Events Emitted Rate',
    }),
    description: i18n.translate('xpack.monitoring.metrics.logstash.eventsEmittedRateDescription', {
      defaultMessage:
        'Number of events emitted per second by all Logstash nodes at the outputs stage.',
    }),
  }),
  logstash_cluster_events_latency: new LogstashEventsLatencyClusterMetric({
    field: 'logstash_stats.events.out',
    label: i18n.translate('xpack.monitoring.metrics.logstash.eventLatencyLabel', {
      defaultMessage: 'Event Latency',
    }),
    description: i18n.translate('xpack.monitoring.metrics.logstash.eventLatencyDescription', {
      defaultMessage:
        'Average time spent by events in the filter and output stages, which is the total ' +
        'time it takes to process events divided by number of events emitted.',
    }),
  }),
  logstash_events_input_rate: new LogstashEventsRateMetric({
    field: 'logstash_stats.events.in',
    label: i18n.translate('xpack.monitoring.metrics.logstashInstance.eventsReceivedRateLabel', {
      defaultMessage: 'Events Received Rate',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.logstashInstance.eventsReceivedRateDescription',
      {
        defaultMessage:
          'Number of events received per second by the Logstash node at the inputs stage.',
      }
    ),
  }),
  logstash_events_output_rate: new LogstashEventsRateMetric({
    field: 'logstash_stats.events.out',
    label: i18n.translate('xpack.monitoring.metrics.logstashInstance.eventsEmittedRateLabel', {
      defaultMessage: 'Events Emitted Rate',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.logstashInstance.eventsEmittedRateDescription',
      {
        defaultMessage:
          'Number of events emitted per second by the Logstash node at the outputs stage.',
      }
    ),
  }),
  logstash_events_latency: new LogstashEventsLatencyMetric({
    field: 'logstash_stats.events.out',
    label: i18n.translate('xpack.monitoring.metrics.logstashInstance.eventLatencyLabel', {
      defaultMessage: 'Event Latency',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.logstashInstance.eventLatencyDescription',
      {
        defaultMessage:
          'Average time spent by events in the filter and output stages, which is the total ' +
          'time it takes to process events divided by number of events emitted.',
      }
    ),
  }),
  logstash_os_load_1m: new LogstashMetric({
    title: instanceSystemLoadTitle,
    field: 'logstash_stats.os.cpu.load_average.1m',
    label: i18n.translate('xpack.monitoring.metrics.logstashInstance.systemLoad.last1MinuteLabel', {
      defaultMessage: '1m',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.logstashInstance.systemLoad.last1MinuteDescription',
      {
        defaultMessage: 'Load average over the last minute.',
      }
    ),
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '',
  }),
  logstash_os_load_5m: new LogstashMetric({
    title: instanceSystemLoadTitle,
    field: 'logstash_stats.os.cpu.load_average.5m',
    label: i18n.translate(
      'xpack.monitoring.metrics.logstashInstance.systemLoad.last5MinutesLabel',
      {
        defaultMessage: '5m',
      }
    ),
    description: i18n.translate(
      'xpack.monitoring.metrics.logstashInstance.systemLoad.last5MinutesDescription',
      {
        defaultMessage: 'Load average over the last 5 minutes.',
      }
    ),
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '',
  }),
  logstash_os_load_15m: new LogstashMetric({
    title: instanceSystemLoadTitle,
    field: 'logstash_stats.os.cpu.load_average.15m',
    label: i18n.translate(
      'xpack.monitoring.metrics.logstashInstance.systemLoad.last15MinutesLabel',
      {
        defaultMessage: '15m',
      }
    ),
    description: i18n.translate(
      'xpack.monitoring.metrics.logstashInstance.systemLoad.last15MinutesDescription',
      {
        defaultMessage: 'Load average over the last 15 minutes.',
      }
    ),
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '',
  }),
  logstash_node_jvm_mem_max_in_bytes: new LogstashMetric({
    field: 'logstash_stats.jvm.mem.heap_max_in_bytes',
    title: instanceJvmHeapTitle,
    label: i18n.translate('xpack.monitoring.metrics.logstashInstance.jvmHeap.maxHeapLabel', {
      defaultMessage: 'Max Heap',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.logstashInstance.jvmHeap.maxHeapDescription',
      {
        defaultMessage: 'Total heap available to Logstash running in the JVM.',
      }
    ),
    format: SMALL_BYTES,
    metricAgg: 'max',
    units: 'B',
  }),
  logstash_node_jvm_mem_used_in_bytes: new LogstashMetric({
    field: 'logstash_stats.jvm.mem.heap_used_in_bytes',
    title: instanceJvmHeapTitle,
    label: i18n.translate('xpack.monitoring.metrics.logstashInstance.jvmHeap.usedHeapLabel', {
      defaultMessage: 'Used Heap',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.logstashInstance.jvmHeap.usedHeapDescription',
      {
        defaultMessage: 'Total heap used by Logstash running in the JVM.',
      }
    ),
    format: SMALL_BYTES,
    metricAgg: 'max',
    units: 'B',
  }),
  logstash_node_cpu_utilization: new LogstashMetric({
    field: 'logstash_stats.process.cpu.percent',
    label: instanceCpuUtilizationLabel,
    description: i18n.translate(
      'xpack.monitoring.metrics.logstashInstance.cpuUtilizationDescription',
      {
        defaultMessage: 'Percentage of CPU usage reported by the OS (100% is the max).',
      }
    ),
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '%',
  }),
  logstash_node_cgroup_periods: new LogstashMetric({
    field: 'logstash_stats.os.cgroup.cpu.stat.number_of_elapsed_periods',
    title: instanceCgroupCfsStatsTitle,
    label: i18n.translate(
      'xpack.monitoring.metrics.logstashInstance.cgroupCfsStats.cgroupElapsedPeriodsLabel',
      {
        defaultMessage: 'Cgroup Elapsed Periods',
      }
    ),
    description: i18n.translate(
      'xpack.monitoring.metrics.logstashInstance.cgroupCfsStats.cgroupElapsedPeriodsDescription',
      {
        defaultMessage:
          'The number of sampling periods from the Completely Fair Scheduler (CFS). Compare against the number of times throttled.',
      }
    ),
    format: LARGE_FLOAT,
    metricAgg: 'max',
    derivative: true,
    units: '',
  }),
  logstash_node_cgroup_throttled: new LogstashMetric({
    field: 'logstash_stats.os.cgroup.cpu.stat.time_throttled_nanos',
    title: instanceCgroupCpuPerformanceTitle,
    label: i18n.translate(
      'xpack.monitoring.metrics.logstashInstance.cgroupCpuPerformance.cgroupThrottlingLabel',
      {
        defaultMessage: 'Cgroup Throttling',
      }
    ),
    description: i18n.translate(
      'xpack.monitoring.metrics.logstashInstance.cgroupCpuPerformance.cgroupThrottlingDescription',
      {
        defaultMessage: 'The amount of throttled time, reported in nanoseconds, of the Cgroup.',
      }
    ),
    format: LARGE_ABBREVIATED,
    metricAgg: 'max',
    derivative: true,
    units: nsTimeUnitLabel,
  }),
  logstash_node_cgroup_throttled_count: new LogstashMetric({
    field: 'logstash_stats.os.cgroup.cpu.stat.number_of_times_throttled',
    title: instanceCgroupCfsStatsTitle,
    label: i18n.translate(
      'xpack.monitoring.metrics.logstashInstance.cgroupCfsStats.cgroupThrottledCountLabel',
      {
        defaultMessage: 'Cgroup Throttled Count',
      }
    ),
    description: i18n.translate(
      'xpack.monitoring.metrics.logstashInstance.cgroupCfsStats.cgroupThrottledCountDescription',
      {
        defaultMessage: 'The number of times that the CPU was throttled by the Cgroup.',
      }
    ),
    format: LARGE_FLOAT,
    metricAgg: 'max',
    derivative: true,
    units: '',
  }),
  logstash_node_cgroup_usage: new LogstashMetric({
    field: 'logstash_stats.os.cgroup.cpuacct.usage_nanos',
    title: instanceCgroupCpuPerformanceTitle,
    label: i18n.translate(
      'xpack.monitoring.metrics.logstashInstance.cgroupCpuPerformance.cgroupUsageLabel',
      {
        defaultMessage: 'Cgroup Usage',
      }
    ),
    description: i18n.translate(
      'xpack.monitoring.metrics.logstashInstance.cgroupCpuPerformance.cgroupUsageDescription',
      {
        defaultMessage:
          'The usage, reported in nanoseconds, of the Cgroup. Compare this with the throttling to discover issues.',
      }
    ),
    format: LARGE_ABBREVIATED,
    metricAgg: 'max',
    derivative: true,
    units: nsTimeUnitLabel,
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
      label: i18n.translate(
        'xpack.monitoring.metrics.logstashInstance.cpuUtilization.cgroupCpuUtilizationLabel',
        {
          defaultMessage: 'Cgroup CPU Utilization',
        }
      ),
      description: i18n.translate(
        'xpack.monitoring.metrics.logstashInstance.cgroupCpuUtilizationDescription',
        {
          defaultMessage:
            'CPU Usage time compared to the CPU quota shown in percentage. If CPU quotas are not set, then no data will be shown.',
        }
      ),
    };
    return {
      logstash_node_cgroup_quota: new QuotaMetric({
        ...quotaMetricConfig,
        title: i18n.translate('xpack.monitoring.metrics.logstashInstance.cpuUtilizationTitle', {
          defaultMessage: 'CPU Utilization',
        }),
      }),
      logstash_node_cgroup_quota_as_cpu_utilization: new QuotaMetric({
        ...quotaMetricConfig,
        label: instanceCpuUtilizationLabel, //  override the "Cgroup CPU..." label
      }),
    };
  })(),
  logstash_queue_events_count: new LogstashMetric({
    field: 'logstash_stats.queue.events_count',
    label: i18n.translate('xpack.monitoring.metrics.logstashInstance.eventsQueuedLabel', {
      defaultMessage: 'Events Queued',
    }),
    title: i18n.translate('xpack.monitoring.metrics.logstashInstance.persistentQueueEventsTitle', {
      defaultMessage: 'Persistent Queue Events',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.logstashInstance.eventsQueuedDescription',
      {
        defaultMessage:
          'Average number of events in the persistent queue waiting to be processed by the filter and output stages.',
      }
    ),
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '',
  }),
  logstash_pipeline_queue_size: new LogstashPipelineQueueSizeMetric({
    field: 'logstash_stats.pipelines.queue.queue_size_in_bytes',
    label: i18n.translate('xpack.monitoring.metrics.logstashInstance.queueSizeLabel', {
      defaultMessage: 'Queue Size',
    }),
    description: i18n.translate('xpack.monitoring.metrics.logstashInstance.queueSizeDescription', {
      defaultMessage:
        'Current size of all persistent queues in the Logstash pipelines on this node.',
    }),
    title: i18n.translate('xpack.monitoring.metrics.logstashInstance.persistentQueueSizeTitle', {
      defaultMessage: 'Persistent Queue Size',
    }),
    format: LARGE_BYTES,
    units: 'B',
  }),
  logstash_pipeline_max_queue_size: new LogstashPipelineQueueSizeMetric({
    field: 'logstash_stats.pipelines.queue.max_queue_size_in_bytes',
    label: i18n.translate('xpack.monitoring.metrics.logstashInstance.maxQueueSizeLabel', {
      defaultMessage: 'Max Queue Size',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.logstashInstance.maxQueueSizeDescription',
      {
        defaultMessage: 'Maximum size set for the persistent queues on this node.',
      }
    ),
    format: LARGE_BYTES,
    units: 'B',
  }),
  logstash_cluster_pipeline_throughput: new LogstashPipelineThroughputMetric({
    field: 'logstash_stats.pipelines.events.out',
    label: pipelineThroughputLabel,
    description: pipelineThroughputDescription,
    format: LARGE_FLOAT,
    units: eventsPerSecondUnitLabel,
  }),
  logstash_node_pipeline_throughput: new LogstashPipelineThroughputMetric({
    uuidField: 'logstash_stats.logstash.uuid', // TODO: add comment explaining why
    field: 'logstash_stats.pipelines.events.out',
    label: pipelineThroughputLabel,
    description: pipelineThroughputDescription,
    format: LARGE_FLOAT,
    units: eventsPerSecondUnitLabel,
  }),
  logstash_cluster_pipeline_nodes_count: new LogstashPipelineNodeCountMetric({
    field: 'logstash_stats.logstash.uuid',
    label: pipelineNodeCountLabel,
    description: pipelineNodeCountDescription,
    format: LARGE_FLOAT,
    units: '',
  }),
  logstash_node_pipeline_nodes_count: new LogstashPipelineNodeCountMetric({
    uuidField: 'logstash_stats.logstash.uuid', // TODO: add comment explaining why
    field: 'logstash_stats.logstash.uuid',
    label: pipelineNodeCountLabel,
    description: pipelineNodeCountDescription,
    format: LARGE_FLOAT,
    units: '',
  }),
};
