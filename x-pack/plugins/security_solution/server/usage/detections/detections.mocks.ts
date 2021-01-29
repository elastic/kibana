/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { INTERNAL_IMMUTABLE_KEY } from '../../../common/constants';

export const getMockJobSummaryResponse = () => [
  {
    id: 'linux_anomalous_network_activity_ecs',
    description:
      'SIEM Auditbeat: Looks for unusual processes using the network which could indicate command-and-control, lateral movement, persistence, or data exfiltration activity (beta)',
    groups: ['auditbeat', 'process', 'siem'],
    processed_record_count: 141889,
    memory_status: 'ok',
    jobState: 'opened',
    hasDatafeed: true,
    datafeedId: 'datafeed-linux_anomalous_network_activity_ecs',
    datafeedIndices: ['auditbeat-*'],
    datafeedState: 'started',
    latestTimestampMs: 1594085401911,
    earliestTimestampMs: 1593054845656,
    latestResultsTimestampMs: 1594085401911,
    isSingleMetricViewerJob: true,
    nodeName: 'node',
  },
  {
    id: 'linux_anomalous_network_port_activity_ecs',
    description:
      'SIEM Auditbeat: Looks for unusual destination port activity that could indicate command-and-control, persistence mechanism, or data exfiltration activity (beta)',
    groups: ['auditbeat', 'process', 'siem'],
    processed_record_count: 0,
    memory_status: 'ok',
    jobState: 'closed',
    hasDatafeed: true,
    datafeedId: 'datafeed-linux_anomalous_network_port_activity_ecs',
    datafeedIndices: ['auditbeat-*'],
    datafeedState: 'stopped',
    isSingleMetricViewerJob: true,
  },
  {
    id: 'other_job',
    description: 'a job that is custom',
    groups: ['auditbeat', 'process', 'security'],
    processed_record_count: 0,
    memory_status: 'ok',
    jobState: 'closed',
    hasDatafeed: true,
    datafeedId: 'datafeed-other',
    datafeedIndices: ['auditbeat-*'],
    datafeedState: 'stopped',
    isSingleMetricViewerJob: true,
  },
  {
    id: 'another_job',
    description: 'another job that is custom',
    groups: ['auditbeat', 'process', 'security'],
    processed_record_count: 0,
    memory_status: 'ok',
    jobState: 'opened',
    hasDatafeed: true,
    datafeedId: 'datafeed-another',
    datafeedIndices: ['auditbeat-*'],
    datafeedState: 'started',
    isSingleMetricViewerJob: true,
  },
  {
    id: 'irrelevant_job',
    description: 'a non-security job',
    groups: ['auditbeat', 'process'],
    processed_record_count: 0,
    memory_status: 'ok',
    jobState: 'opened',
    hasDatafeed: true,
    datafeedId: 'datafeed-another',
    datafeedIndices: ['auditbeat-*'],
    datafeedState: 'started',
    isSingleMetricViewerJob: true,
  },
];

export const getMockListModulesResponse = () => [
  {
    id: 'siem_auditbeat',
    title: 'SIEM Auditbeat',
    description:
      'Detect suspicious network activity and unusual processes in Auditbeat data (beta).',
    type: 'Auditbeat data',
    logoFile: 'logo.json',
    defaultIndexPattern: 'auditbeat-*',
    query: {
      bool: {
        filter: [
          {
            term: {
              'agent.type': 'auditbeat',
            },
          },
        ],
      },
    },
    jobs: [
      {
        id: 'linux_anomalous_network_activity_ecs',
        config: {
          job_type: 'anomaly_detector',
          description:
            'SIEM Auditbeat: Looks for unusual processes using the network which could indicate command-and-control, lateral movement, persistence, or data exfiltration activity (beta)',
          groups: ['siem', 'auditbeat', 'process'],
          analysis_config: {
            bucket_span: '15m',
            detectors: [
              {
                detector_description: 'rare by "process.name"',
                function: 'rare',
                by_field_name: 'process.name',
              },
            ],
            influencers: ['host.name', 'process.name', 'user.name', 'destination.ip'],
          },
          allow_lazy_open: true,
          analysis_limits: {
            model_memory_limit: '64mb',
          },
          data_description: {
            time_field: '@timestamp',
          },
        },
      },
      {
        id: 'linux_anomalous_network_port_activity_ecs',
        config: {
          job_type: 'anomaly_detector',
          description:
            'SIEM Auditbeat: Looks for unusual destination port activity that could indicate command-and-control, persistence mechanism, or data exfiltration activity (beta)',
          groups: ['siem', 'auditbeat', 'network'],
          analysis_config: {
            bucket_span: '15m',
            detectors: [
              {
                detector_description: 'rare by "destination.port"',
                function: 'rare',
                by_field_name: 'destination.port',
              },
            ],
            influencers: ['host.name', 'process.name', 'user.name', 'destination.ip'],
          },
          allow_lazy_open: true,
          analysis_limits: {
            model_memory_limit: '32mb',
          },
          data_description: {
            time_field: '@timestamp',
          },
        },
      },
    ],
    datafeeds: [],
    kibana: {},
  },
];

export const getMockRulesResponse = () => ({
  hits: {
    hits: [
      { _source: { alert: { enabled: true, tags: [`${INTERNAL_IMMUTABLE_KEY}:true`] } } },
      { _source: { alert: { enabled: true, tags: [`${INTERNAL_IMMUTABLE_KEY}:false`] } } },
      { _source: { alert: { enabled: false, tags: [`${INTERNAL_IMMUTABLE_KEY}:true`] } } },
      { _source: { alert: { enabled: true, tags: [`${INTERNAL_IMMUTABLE_KEY}:true`] } } },
      { _source: { alert: { enabled: false, tags: [`${INTERNAL_IMMUTABLE_KEY}:false`] } } },
      { _source: { alert: { enabled: false, tags: [`${INTERNAL_IMMUTABLE_KEY}:true`] } } },
      { _source: { alert: { enabled: false, tags: [`${INTERNAL_IMMUTABLE_KEY}:true`] } } },
    ],
  },
});

export const getMockMlJobDetailsResponse = () => ({
  job_id: 'high_distinct_count_error_message',
  job_type: 'anomaly_detector',
  job_version: '8.0.0',
  create_time: 1603838214983,
  finished_time: 1611739871669,
  model_snapshot_id: '1611740107',
  custom_settings: {
    created_by: 'ml-module-siem-cloudtrail',
  },
  groups: ['cloudtrail', 'security'],
  description: 'Security: Cloudtrail',
  analysis_config: {
    bucket_span: '15m',
    detectors: [
      {
        detector_description: 'high_distinct_count("aws.cloudtrail.error_message")',
        function: 'high_distinct_count',
        field_name: 'aws.cloudtrail.error_message',
        detector_index: 0,
      },
    ],
    influencers: ['aws.cloudtrail.user_identity.arn', 'source.ip', 'source.geo.city_name'],
  },
  analysis_limits: {
    model_memory_limit: '16mb',
    categorization_examples_limit: 4,
  },
  data_description: {
    time_field: '@timestamp',
    time_format: 'epoch_ms',
  },
  model_snapshot_retention_days: 10,
  daily_model_snapshot_retention_after_days: 1,
  results_index_name: 'custom-high_distinct_count_error_message',
  allow_lazy_open: true,
});
