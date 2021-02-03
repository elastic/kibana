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
  count: 20,
  jobs: [
    {
      job_id: 'high_distinct_count_error_message',
      job_type: 'anomaly_detector',
      job_version: '8.0.0',
      create_time: 1603838214983,
      finished_time: 1611739871669,
      model_snapshot_id: '1611740107',
      custom_settings: {
        created_by: undefined,
      },
      groups: ['cloudtrail', 'security'],
      description:
        'Security: Cloudtrail - Looks for a spike in the rate of an error message which may simply indicate an impending service failure but these can also be byproducts of attempted or successful persistence, privilege escalation, defense evasion, discovery, lateral movement, or collection activity by a threat actor.',
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
    },
  ],
});

export const getMockMlJobStatsResponse = () => ({
  count: 1,
  jobs: [
    {
      job_id: 'high_distinct_count_error_message',
      data_counts: {
        job_id: 'high_distinct_count_error_message',
        processed_record_count: 162,
        processed_field_count: 476,
        input_bytes: 45957,
        input_field_count: 476,
        invalid_date_count: 0,
        missing_field_count: 172,
        out_of_order_timestamp_count: 0,
        empty_bucket_count: 8590,
        sparse_bucket_count: 0,
        bucket_count: 8612,
        earliest_record_timestamp: 1602648289000,
        latest_record_timestamp: 1610399348000,
        last_data_time: 1610470367123,
        latest_empty_bucket_timestamp: 1610397900000,
        input_record_count: 162,
        log_time: 1610470367123,
      },
      model_size_stats: {
        job_id: 'high_distinct_count_error_message',
        result_type: 'model_size_stats',
        model_bytes: 72574,
        peak_model_bytes: 78682,
        model_bytes_exceeded: 0,
        model_bytes_memory_limit: 16777216,
        total_by_field_count: 4,
        total_over_field_count: 0,
        total_partition_field_count: 3,
        bucket_allocation_failures_count: 0,
        memory_status: 'ok',
        assignment_memory_basis: 'current_model_bytes',
        categorized_doc_count: 0,
        total_category_count: 0,
        frequent_category_count: 0,
        rare_category_count: 0,
        dead_category_count: 0,
        failed_category_count: 0,
        categorization_status: 'ok',
        log_time: 1611740107843,
        timestamp: 1611738900000,
      },
      forecasts_stats: {
        total: 0,
        forecasted_jobs: 0,
      },
      state: 'closed',
      timing_stats: {
        job_id: 'high_distinct_count_error_message',
        bucket_count: 16236,
        total_bucket_processing_time_ms: 7957.00000000008,
        minimum_bucket_processing_time_ms: 0,
        maximum_bucket_processing_time_ms: 392,
        average_bucket_processing_time_ms: 0.4900837644740133,
        exponential_average_bucket_processing_time_ms: 0.23614068552903306,
        exponential_average_bucket_processing_time_per_hour_ms: 1.5551298175461634,
      },
    },
  ],
});

export const getMockMlDatafeedsResponse = () => ({
  datafeed_id: 'datafeed-high_distinct_count_error_message',
  job_id: 'high_distinct_count_error_message',
  query_delay: '80308ms',
  chunking_config: {},
  indices_options: {},
  query: {},
  indices: ['filebeat-*'],
  scroll_size: 1000,
  delayed_data_check_config: {},
  max_empty_searches: 10,
});

export const getMockMlDatafeedStatsResponse = () => ({
  datafeed_id: 'datafeed-high_distinct_count_error_message',
  state: 'stopped',
  timing_stats: {
    job_id: 'high_distinct_count_error_message',
    search_count: 7202,
    bucket_count: 8612,
    total_search_time_ms: 3107147,
    average_search_time_per_bucket_ms: 360.7927310729215,
    exponential_average_search_time_per_hour_ms: 86145.39799630083,
  },
});
