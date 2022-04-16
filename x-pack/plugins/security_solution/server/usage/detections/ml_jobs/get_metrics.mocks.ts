/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFindResponse } from '@kbn/core/server';
import type { RuleSearchResult } from '../../types';

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

export const getMockMlJobSummaryResponse = () => [
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

export const getMockMlDatafeedStatsResponse = () => ({
  count: 1,
  datafeeds: [
    {
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
    },
  ],
});

export const getMockRuleSearchResponse = (
  immutableTag: string = '__internal_immutable:true'
): SavedObjectsFindResponse<RuleSearchResult, never> =>
  ({
    page: 1,
    per_page: 1_000,
    total: 1,
    saved_objects: [
      {
        type: 'alert',
        id: '6eecd8c2-8bfb-11eb-afbe-1b7a66309c6d',
        namespaces: ['default'],
        attributes: {
          name: 'Azure Diagnostic Settings Deletion',
          tags: [
            'Elastic',
            'Cloud',
            'Azure',
            'Continuous Monitoring',
            'SecOps',
            'Monitoring',
            '__internal_rule_id:5370d4cd-2bb3-4d71-abf5-1e1d0ff5a2de',
            `${immutableTag}`,
          ],
          alertTypeId: 'siem.queryRule',
          consumer: 'siem',
          params: {
            author: ['Elastic'],
            description:
              'Identifies the deletion of diagnostic settings in Azure, which send platform logs and metrics to different destinations. An adversary may delete diagnostic settings in an attempt to evade defenses.',
            ruleId: '5370d4cd-2bb3-4d71-abf5-1e1d0ff5a2de',
            index: ['filebeat-*', 'logs-azure*'],
            falsePositives: [
              'Deletion of diagnostic settings may be done by a system or network administrator. Verify whether the username, hostname, and/or resource name should be making changes in your environment. Diagnostic settings deletion from unfamiliar users or hosts should be investigated. If known behavior is causing false positives, it can be exempted from the rule.',
            ],
            from: 'now-25m',
            immutable: true,
            query:
              'event.dataset:azure.activitylogs and azure.activitylogs.operation_name:"MICROSOFT.INSIGHTS/DIAGNOSTICSETTINGS/DELETE" and event.outcome:(Success or success)',
            language: 'kuery',
            license: 'Elastic License v2',
            outputIndex: '.siem-signals',
            maxSignals: 100,
            riskScore: 47,
            timestampOverride: 'event.ingested',
            to: 'now',
            type: 'query',
            references: [
              'https://docs.microsoft.com/en-us/azure/azure-monitor/platform/diagnostic-settings',
            ],
            note: 'The Azure Filebeat module must be enabled to use this rule.',
            version: 4,
            exceptionsList: [],
          },
          schedule: {
            interval: '5m',
          },
          enabled: false,
          actions: [],
          throttle: null,
          notifyWhen: 'onActiveAlert',
          apiKeyOwner: null,
          apiKey: '',
          legacyId: null,
          createdBy: 'user',
          updatedBy: 'user',
          createdAt: '2021-03-23T17:15:59.634Z',
          updatedAt: '2021-03-23T17:15:59.634Z',
          muteAll: true,
          mutedInstanceIds: [],
          monitoring: {
            execution: {
              history: [],
              calculated_metrics: {
                success_ratio: 1,
                p99: 7981,
                p50: 1653,
                p95: 6523.699999999996,
              },
            },
          },
          meta: {
            versionApiKeyLastmodified: '8.2.0',
          },
          scheduledTaskId: '6eecd8c2-8bfb-11eb-afbe-1b7a66309c6d',
        },
        references: [],
        migrationVersion: {
          alert: '8.0.0',
        },
        coreMigrationVersion: '8.2.0',
        updated_at: '2021-03-23T17:15:59.634Z',
        version: 'Wzk4NTQwLDNd',
        score: 0,
        sort: ['1644865254209', '19548'],
      },
    ],
    // NOTE: We have to cast as "unknown" and then back to "RuleSearchResult" because "RuleSearchResult" isn't an exact type. See notes in the JSDocs fo that type.
  } as unknown as SavedObjectsFindResponse<RuleSearchResult, never>);
