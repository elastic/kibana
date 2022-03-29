/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  KibanaEventsRateClusterMetric,
  KibanaMetric,
  KibanaClusterRuleMetric,
  KibanaInstanceRuleMetric,
  KibanaInstanceActionMetric,
  KibanaClusterActionMetric,
} from './classes';
import { LARGE_FLOAT, SMALL_FLOAT, LARGE_BYTES } from '../../../../common/formatting';

const clientResponseTimeTitle = i18n.translate(
  'xpack.monitoring.metrics.kibana.clientResponseTimeTitle',
  {
    defaultMessage: 'Client Response Time',
  }
);
const instanceSystemLoadTitle = i18n.translate(
  'xpack.monitoring.metrics.kibanaInstance.systemLoadTitle',
  {
    defaultMessage: 'System Load',
  }
);
const instanceMemorySizeTitle = i18n.translate(
  'xpack.monitoring.metrics.kibanaInstance.memorySizeTitle',
  {
    defaultMessage: 'Memory Size',
  }
);
const instanceClientResponseTimeTitle = i18n.translate(
  'xpack.monitoring.metrics.kibanaInstance.clientResponseTimeTitle',
  {
    defaultMessage: 'Client Response Time',
  }
);
const msTimeUnitLabel = i18n.translate('xpack.monitoring.metrics.kibana.msTimeUnitLabel', {
  defaultMessage: 'ms',
});

export const metrics = {
  kibana_cluster_requests: new KibanaEventsRateClusterMetric({
    field: 'kibana_stats.requests.total',
    label: i18n.translate('xpack.monitoring.metrics.kibana.clientRequestsLabel', {
      defaultMessage: 'Client Requests',
    }),
    description: i18n.translate('xpack.monitoring.metrics.kibana.clientRequestsDescription', {
      defaultMessage: 'Total number of client requests received by the Kibana instance.',
    }),
    format: SMALL_FLOAT,
    units: '',
  }),
  kibana_cluster_max_response_times: new KibanaEventsRateClusterMetric({
    title: clientResponseTimeTitle,
    field: 'kibana_stats.response_times.max',
    label: i18n.translate('xpack.monitoring.metrics.kibana.clientResponseTime.maxLabel', {
      defaultMessage: 'Max',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.kibana.clientResponseTime.maxDescription',
      {
        defaultMessage: 'Maximum response time for client requests to the Kibana instance.',
      }
    ),
    format: SMALL_FLOAT,
    units: msTimeUnitLabel,
  }),
  kibana_cluster_average_response_times: new KibanaEventsRateClusterMetric({
    title: clientResponseTimeTitle,
    field: 'kibana_stats.response_times.average',
    label: i18n.translate('xpack.monitoring.metrics.kibana.clientResponseTime.averageLabel', {
      defaultMessage: 'Average',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.kibana.clientResponseTime.averageDescription',
      {
        defaultMessage: 'Average response time for client requests to the Kibana instance.',
      }
    ),
    format: SMALL_FLOAT,
    units: msTimeUnitLabel,
  }),
  kibana_os_load_1m: new KibanaMetric({
    title: instanceSystemLoadTitle,
    field: 'kibana_stats.os.load.1m',
    label: i18n.translate('xpack.monitoring.metrics.kibanaInstance.systemLoad.last1MinuteLabel', {
      defaultMessage: '1m',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.kibanaInstance.systemLoad.last1MinuteDescription',
      {
        defaultMessage: 'Load average over the last minute.',
      }
    ),
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '',
  }),
  kibana_os_load_5m: new KibanaMetric({
    title: instanceSystemLoadTitle,
    field: 'kibana_stats.os.load.5m',
    label: i18n.translate('xpack.monitoring.metrics.kibanaInstance.systemLoad.last5MinutesLabel', {
      defaultMessage: '5m',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.kibanaInstance.systemLoad.last5MinutesDescription',
      {
        defaultMessage: 'Load average over the last 5 minutes.',
      }
    ),
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '',
  }),
  kibana_os_load_15m: new KibanaMetric({
    title: instanceSystemLoadTitle,
    field: 'kibana_stats.os.load.15m',
    label: i18n.translate('xpack.monitoring.metrics.kibanaInstance.systemLoad.last15MinutesLabel', {
      defaultMessage: '15m',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.kibanaInstance.systemLoad.last15MinutesDescription',
      {
        defaultMessage: 'Load average over the last 15 minutes.',
      }
    ),
    format: LARGE_FLOAT,
    metricAgg: 'max',
    units: '',
  }),
  kibana_memory_heap_size_limit: new KibanaMetric({
    title: instanceMemorySizeTitle,
    field: 'kibana_stats.process.memory.heap.size_limit',
    label: i18n.translate('xpack.monitoring.metrics.kibanaInstance.memorySize.heapSizeLimitLabel', {
      defaultMessage: 'Heap Size Limit',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.kibanaInstance.memorySize.heapSizeLimitDescription',
      {
        defaultMessage: 'Limit of memory usage before garbage collection.',
      }
    ),
    format: LARGE_BYTES,
    metricAgg: 'max',
    units: 'B',
  }),
  kibana_memory_size: new KibanaMetric({
    title: instanceMemorySizeTitle,
    field: 'kibana_stats.process.memory.resident_set_size_in_bytes',
    label: i18n.translate('xpack.monitoring.metrics.kibanaInstance.memorySizeLabel', {
      defaultMessage: 'Memory Size',
    }),
    description: i18n.translate('xpack.monitoring.metrics.kibanaInstance.memorySizeDescription', {
      defaultMessage: 'Total heap used by Kibana running in Node.js.',
    }),
    format: LARGE_BYTES,
    metricAgg: 'max',
    units: 'B',
  }),
  kibana_process_delay: new KibanaMetric({
    field: 'kibana_stats.process.event_loop_delay',
    label: i18n.translate('xpack.monitoring.metrics.kibanaInstance.eventLoopDelayLabel', {
      defaultMessage: 'Event Loop Delay',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.kibanaInstance.eventLoopDelayDescription',
      {
        defaultMessage:
          'Delay in Kibana server event loops. Longer delays may indicate blocking events in server thread, ' +
          'such as synchronous functions taking large amount of CPU time.',
      }
    ),
    format: SMALL_FLOAT,
    metricAgg: 'max',
    units: msTimeUnitLabel,
  }),
  kibana_average_response_times: new KibanaMetric({
    title: instanceClientResponseTimeTitle,
    field: 'kibana_stats.response_times.average',
    label: i18n.translate(
      'xpack.monitoring.metrics.kibanaInstance.clientResponseTime.averageLabel',
      {
        defaultMessage: 'Average',
      }
    ),
    description: i18n.translate(
      'xpack.monitoring.metrics.kibanaInstance.clientResponseTime.averageDescription',
      {
        defaultMessage: 'Average response time for client requests to the Kibana instance.',
      }
    ),
    format: SMALL_FLOAT,
    metricAgg: 'max',
    units: msTimeUnitLabel,
  }),
  kibana_max_response_times: new KibanaMetric({
    title: instanceClientResponseTimeTitle,
    field: 'kibana_stats.response_times.max',
    label: i18n.translate('xpack.monitoring.metrics.kibanaInstance.clientResponseTime.maxLabel', {
      defaultMessage: 'Max',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.kibanaInstance.clientResponseTime.maxDescription',
      {
        defaultMessage: 'Maximum response time for client requests to the Kibana instance.',
      }
    ),
    format: SMALL_FLOAT,
    metricAgg: 'max',
    units: msTimeUnitLabel,
  }),
  kibana_average_concurrent_connections: new KibanaMetric({
    field: 'kibana_stats.concurrent_connections',
    label: i18n.translate('xpack.monitoring.metrics.kibana.httpConnectionsLabel', {
      defaultMessage: 'HTTP Connections',
    }),
    description: i18n.translate('xpack.monitoring.metrics.kibana.httpConnectionsDescription', {
      defaultMessage: 'Total number of open socket connections to the Kibana instance.',
    }),
    format: SMALL_FLOAT,
    metricAgg: 'max',
    units: '',
  }),
  kibana_requests_total: new KibanaMetric({
    field: 'kibana_stats.requests.total',
    label: i18n.translate('xpack.monitoring.metrics.kibanaInstance.clientRequestsLabel', {
      defaultMessage: 'Client Requests',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.kibanaInstance.clientRequestsDescription',
      {
        defaultMessage: 'Total number of client requests received by the Kibana instance.',
      }
    ),
    format: SMALL_FLOAT,
    metricAgg: 'max',
    units: '',
  }),
  kibana_requests_disconnects: new KibanaMetric({
    field: 'kibana_stats.requests.disconnects',
    label: i18n.translate(
      'xpack.monitoring.metrics.kibanaInstance.clientRequestsDisconnectsLabel',
      {
        defaultMessage: 'Client Disconnects',
      }
    ),
    description: i18n.translate(
      'xpack.monitoring.metrics.kibanaInstance.clientRequestsDisconnectsDescription',
      {
        defaultMessage: 'Total number of client disconnects to the Kibana instance.',
      }
    ),
    format: SMALL_FLOAT,
    metricAgg: 'max',
    units: '',
  }),

  kibana_instance_rule_failures: new KibanaInstanceRuleMetric({
    derivative: true,
    field: 'kibana.node_rules.failures',
    label: i18n.translate('xpack.monitoring.metrics.kibanaInstance.ruleInstanceFailuresLabel', {
      defaultMessage: 'Rule Failures Rate',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.kibanaInstance.ruleInstanceFailuresDescription',
      {
        defaultMessage: 'Rate of rule executions for the Kibana instance.',
      }
    ),
    format: SMALL_FLOAT,
    metricAgg: 'max',
    units: '',
  }),
  kibana_instance_rule_executions: new KibanaInstanceRuleMetric({
    derivative: true,
    field: 'kibana.node_rules.executions',
    label: i18n.translate('xpack.monitoring.metrics.kibanaInstance.ruleInstanceExecutionsLabel', {
      defaultMessage: 'Rule Executions Rate',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.kibanaInstance.ruleInstanceExecutionsDescription',
      {
        defaultMessage: 'Rate of rule executions for the Kibana instance.',
      }
    ),
    format: SMALL_FLOAT,
    metricAgg: 'max',
    units: '',
  }),
  kibana_instance_action_failures: new KibanaInstanceActionMetric({
    derivative: true,
    field: 'kibana.node_actions.failures',
    label: i18n.translate('xpack.monitoring.metrics.kibanaInstance.actionInstanceFailuresLabel', {
      defaultMessage: 'Action Failures Rate',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.kibanaInstance.actionInstanceFailuresDescription',
      {
        defaultMessage: 'Rate of action executions for the Kibana instance.',
      }
    ),
    format: SMALL_FLOAT,
    metricAgg: 'max',
    units: '',
  }),
  kibana_instance_action_executions: new KibanaInstanceActionMetric({
    derivative: true,
    field: 'kibana.node_actions.executions',
    label: i18n.translate('xpack.monitoring.metrics.kibanaInstance.actionInstanceExecutionsLabel', {
      defaultMessage: 'Action Executions Rate',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.kibanaInstance.actionInstanceExecutionsDescription',
      {
        defaultMessage: 'Rate of action executions for the Kibana instance.',
      }
    ),
    format: SMALL_FLOAT,
    metricAgg: 'max',
    units: '',
  }),

  kibana_cluster_rule_overdue_count: new KibanaClusterRuleMetric({
    field: 'kibana.cluster_rules.overdue.count',
    label: i18n.translate('xpack.monitoring.metrics.kibanaInstance.clusterRuleOverdueCountLabel', {
      defaultMessage: 'Rule Overdue Count',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.kibanaInstance.clusterRuleOverdueCountDescription',
      {
        defaultMessage: 'Number of overdue rules across the entire cluster.',
      }
    ),
    format: SMALL_FLOAT,
    metricAgg: 'max',
    units: '',
  }),
  kibana_cluster_rule_overdue_p50: new KibanaClusterRuleMetric({
    field: 'kibana.cluster_rules.overdue.delay.p50',
    label: i18n.translate('xpack.monitoring.metrics.kibanaInstance.clusterRuleOverdueP50Label', {
      defaultMessage: 'Average Rule Overdue Delay',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.kibanaInstance.clusterRuleOverdueP50Description',
      {
        defaultMessage: 'Average delay of all overdue rules across the entire cluster.',
      }
    ),
    format: SMALL_FLOAT,
    metricAgg: 'max',
    units: '',
  }),
  kibana_cluster_rule_overdue_p99: new KibanaClusterRuleMetric({
    field: 'kibana.cluster_rules.overdue.delay.p99',
    label: i18n.translate('xpack.monitoring.metrics.kibanaInstance.clusterRuleOverdueP99Label', {
      defaultMessage: 'Worst Rule Overdue Delay',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.kibanaInstance.clusterRuleOverdueP99Description',
      {
        defaultMessage: 'Worst delay of all overdue rules across the entire cluster.',
      }
    ),
    format: SMALL_FLOAT,
    metricAgg: 'max',
    units: '',
  }),
  kibana_cluster_action_overdue_count: new KibanaClusterActionMetric({
    field: 'kibana.cluster_actions.overdue.count',
    label: i18n.translate(
      'xpack.monitoring.metrics.kibanaInstance.clusterActionOverdueCountLabel',
      {
        defaultMessage: 'Action Overdue Count',
      }
    ),
    description: i18n.translate(
      'xpack.monitoring.metrics.kibanaInstance.clusterActionOverdueCountDescription',
      {
        defaultMessage: 'Number of overdue actions across the entire cluster.',
      }
    ),
    format: SMALL_FLOAT,
    metricAgg: 'max',
    units: '',
  }),
  kibana_cluster_action_overdue_p50: new KibanaClusterActionMetric({
    field: 'kibana.cluster_actions.overdue.delay.p50',
    label: i18n.translate('xpack.monitoring.metrics.kibanaInstance.clusterActionOverdueP50Label', {
      defaultMessage: 'Average Action Overdue Delay',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.kibanaInstance.clusterActionOverdueP50Description',
      {
        defaultMessage: 'Average delay of all overdue actions across the entire cluster.',
      }
    ),
    format: SMALL_FLOAT,
    metricAgg: 'max',
    units: '',
  }),
  kibana_cluster_action_overdue_p99: new KibanaClusterActionMetric({
    field: 'kibana.cluster_actions.overdue.delay.p99',
    label: i18n.translate('xpack.monitoring.metrics.kibanaInstance.clusterActionOverdueP99Label', {
      defaultMessage: 'Worst Action Overdue Delay',
    }),
    description: i18n.translate(
      'xpack.monitoring.metrics.kibanaInstance.clusterActionOverdueP99Description',
      {
        defaultMessage: 'Worst delay of all overdue actions across the entire cluster.',
      }
    ),
    format: SMALL_FLOAT,
    metricAgg: 'max',
    units: '',
  }),
};
