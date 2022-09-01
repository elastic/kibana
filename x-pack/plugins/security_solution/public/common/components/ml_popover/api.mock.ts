/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlSummaryJob } from '@kbn/ml-plugin/public';
import type { Module, RecognizerModule, SecurityJob } from './types';

export const mockOpenedJob: MlSummaryJob = {
  datafeedId: 'datafeed-siem-api-rare_process_linux_ecs',
  datafeedIndices: ['auditbeat-*'],
  datafeedState: 'started',
  description: 'SIEM Auditbeat: Detect unusually rare processes on Linux (beta)',
  earliestTimestampMs: 1561651364098,
  groups: ['siem'],
  hasDatafeed: true,
  id: 'siem-api-rare_process_linux_ecs',
  isSingleMetricViewerJob: true,
  jobState: 'opened',
  latestTimestampMs: 1562870521264,
  memory_status: 'hard_limit',
  nodeName: 'siem-es',
  processed_record_count: 3425264,
  awaitingNodeAssignment: false,
  jobTags: {},
  bucketSpanSeconds: 900,
};

export const mockJobsSummaryResponse: MlSummaryJob[] = [
  {
    id: 'rc-rare-process-windows-5',
    description:
      'Looks for rare and anomalous processes on a Windows host. Requires process execution events from Sysmon.',
    groups: ['host'],
    processed_record_count: 8577,
    memory_status: 'ok',
    jobState: 'closed',
    hasDatafeed: true,
    datafeedId: 'datafeed-rc-rare-process-windows-5',
    datafeedIndices: ['winlogbeat-*'],
    datafeedState: 'stopped',
    latestTimestampMs: 1561402325194,
    earliestTimestampMs: 1554327458406,
    isSingleMetricViewerJob: true,
    awaitingNodeAssignment: false,
    jobTags: {},
    bucketSpanSeconds: 900,
  },
  {
    id: 'siem-api-rare_process_linux_ecs',
    description: 'SIEM Auditbeat: Detect unusually rare processes on Linux (beta)',
    groups: ['siem'],
    processed_record_count: 582251,
    memory_status: 'hard_limit',
    jobState: 'closed',
    hasDatafeed: true,
    datafeedId: 'datafeed-siem-api-rare_process_linux_ecs',
    datafeedIndices: ['auditbeat-*'],
    datafeedState: 'stopped',
    latestTimestampMs: 1557434782207,
    earliestTimestampMs: 1557353420495,
    isSingleMetricViewerJob: true,
    awaitingNodeAssignment: false,
    jobTags: {},
    bucketSpanSeconds: 900,
  },
  {
    id: 'siem-api-rare_process_windows_ecs',
    description: 'SIEM Winlogbeat: Detect unusually rare processes on Windows (beta)',
    groups: ['siem'],
    processed_record_count: 0,
    memory_status: 'ok',
    jobState: 'closed',
    hasDatafeed: true,
    datafeedId: 'datafeed-siem-api-rare_process_windows_ecs',
    datafeedIndices: ['winlogbeat-*'],
    datafeedState: 'stopped',
    isSingleMetricViewerJob: true,
    awaitingNodeAssignment: false,
    jobTags: {},
    bucketSpanSeconds: 900,
  },
  {
    id: 'siem-api-suspicious_login_activity_ecs',
    description: 'SIEM Auditbeat: Detect unusually high number of authentication attempts (beta)',
    groups: ['siem'],
    processed_record_count: 0,
    memory_status: 'ok',
    jobState: 'closed',
    hasDatafeed: true,
    datafeedId: 'datafeed-siem-api-suspicious_login_activity_ecs',
    datafeedIndices: ['auditbeat-*'],
    datafeedState: 'stopped',
    isSingleMetricViewerJob: true,
    awaitingNodeAssignment: false,
    jobTags: {},
    bucketSpanSeconds: 900,
  },
];

export const mockGetModuleResponse: Module[] = [
  {
    id: 'security_linux_v3',
    title: 'SIEM Auditbeat',
    description:
      'Detect suspicious network activity and unusual processes in Auditbeat data (beta)',
    type: 'Auditbeat data',
    logoFile: 'logo.json',
    defaultIndexPattern: 'auditbeat-*',
    query: { bool: { filter: [{ term: { 'agent.type': 'auditbeat' } }] } },
    jobs: [
      {
        id: 'rare_process_by_host_linux',
        config: {
          job_type: 'anomaly_detector',
          description: 'SIEM Auditbeat: Detect unusually rare processes on Linux (beta)',
          groups: ['siem', 'auditbeat', 'process'],
          analysis_config: {
            bucket_span: '15m',
            detectors: [
              {
                detector_description: 'rare process executions on Linux',
                function: 'rare',
                by_field_name: 'process.name',
                partition_field_name: 'host.name',
              },
            ],
            influencers: ['host.name', 'process.name', 'user.name'],
          },
          analysis_limits: { model_memory_limit: '256mb' },
          data_description: { time_field: '@timestamp' },
          custom_settings: {
            created_by: 'ml-module-siem-auditbeat',
            custom_urls: [
              {
                url_name: 'Host Details by process name',
                url_value:
                  "siem#/ml-hosts/$host.name$?kqlQuery=(filterQuery:(expression:'process.name%20:%20%22$process.name$%22',kind:kuery),queryLocation:hosts.details,type:details)&timerange=(global:(linkTo:!(timeline),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')),timeline:(linkTo:!(global),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')))",
              },
              {
                url_name: 'Host Details by user name',
                url_value:
                  "siem#/ml-hosts/$host.name$?kqlQuery=(filterQuery:(expression:'user.name%20:%20%22$user.name$%22',kind:kuery),queryLocation:hosts.details,type:details)&timerange=(global:(linkTo:!(timeline),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')),timeline:(linkTo:!(global),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')))",
              },
              {
                url_name: 'Hosts Overview by process name',
                url_value:
                  "siem#/ml-hosts?kqlQuery=(filterQuery:(expression:'process.name%20:%20%22$process.name$%22',kind:kuery),queryLocation:hosts.page,type:page)&timerange=(global:(linkTo:!(timeline),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')),timeline:(linkTo:!(global),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')))",
              },
              {
                url_name: 'Hosts Overview by user name',
                url_value:
                  "siem#/ml-hosts?kqlQuery=(filterQuery:(expression:'user.name%20:%20%22$user.name$%22',kind:kuery),queryLocation:hosts.page,type:page)&timerange=(global:(linkTo:!(timeline),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')),timeline:(linkTo:!(global),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')))",
              },
            ],
          },
        },
      },
    ],
    datafeeds: [
      {
        id: 'datafeed-rare_process_by_host_linux_ecs',
        config: {
          job_id: 'rare_process_by_host_linux_ecs',
          indexes: ['INDEX_PATTERN_NAME'],
          query: {
            bool: {
              filter: [
                { terms: { 'event.action': ['process_started', 'executed'] } },
                { term: { 'agent.type': 'auditbeat' } },
              ],
            },
          },
        },
      },
    ],
    kibana: {},
  },
  {
    id: 'security_windows_v3',
    title: 'SIEM Winlogbeat',
    description: 'Detect unusual processes and network activity in Winlogbeat data (beta)',
    type: 'Winlogbeat data',
    logoFile: 'logo.json',
    defaultIndexPattern: 'winlogbeat-*',
    query: { bool: { filter: [{ term: { 'agent.type': 'winlogbeat' } }] } },
    jobs: [
      {
        id: 'windows_anomalous_network_activity_ecs',
        config: {
          job_type: 'anomaly_detector',
          description:
            'SIEM Winlogbeat: Looks for unusual processes using the network which could indicate command-and-control, lateral movement, persistence, or data exfiltration activity (beta)',
          groups: ['siem', 'winlogbeat', 'network'],
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
          analysis_limits: { model_memory_limit: '64mb' },
          data_description: { time_field: '@timestamp' },
          custom_settings: {
            created_by: 'ml-module-siem-winlogbeat',
            custom_urls: [
              {
                url_name: 'Host Details by process name',
                url_value:
                  "siem#/ml-hosts/$host.name$?kqlQuery=(filterQuery:(expression:'process.name%20:%20%22$process.name$%22',kind:kuery),queryLocation:hosts.details,type:details)&timerange=(global:(linkTo:!(timeline),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')),timeline:(linkTo:!(global),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')))",
              },
              {
                url_name: 'Host Details by user name',
                url_value:
                  "siem#/ml-hosts/$host.name$?kqlQuery=(filterQuery:(expression:'user.name%20:%20%22$user.name$%22',kind:kuery),queryLocation:hosts.details,type:details)&timerange=(global:(linkTo:!(timeline),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')),timeline:(linkTo:!(global),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')))",
              },
              {
                url_name: 'Hosts Overview by process name',
                url_value:
                  "siem#/ml-hosts?kqlQuery=(filterQuery:(expression:'process.name%20:%20%22$process.name$%22',kind:kuery),queryLocation:hosts.page,type:page)&timerange=(global:(linkTo:!(timeline),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')),timeline:(linkTo:!(global),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')))",
              },
              {
                url_name: 'Hosts Overview by user name',
                url_value:
                  "siem#/ml-hosts?kqlQuery=(filterQuery:(expression:'user.name%20:%20%22$user.name$%22',kind:kuery),queryLocation:hosts.page,type:page)&timerange=(global:(linkTo:!(timeline),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')),timeline:(linkTo:!(global),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')))",
              },
            ],
          },
        },
      },
      {
        id: 'windows_anomalous_path_activity_ecs',
        config: {
          job_type: 'anomaly_detector',
          groups: ['siem', 'winlogbeat', 'process'],
          description:
            'SIEM Winlogbeat:  Looks for activity in unusual paths that may indicate execution of malware or persistence mechanisms. Windows payloads often execute from user profile paths (beta)',
          analysis_config: {
            bucket_span: '15m',
            detectors: [
              {
                detector_description: 'rare by "process.working_directory"',
                function: 'rare',
                by_field_name: 'process.working_directory',
              },
            ],
            influencers: ['host.name', 'process.name', 'user.name'],
          },
          analysis_limits: { model_memory_limit: '256mb' },
          data_description: { time_field: '@timestamp' },
          custom_settings: {
            created_by: 'ml-module-siem-winlogbeat',
            custom_urls: [
              {
                url_name: 'Host Details by process name',
                url_value:
                  "siem#/ml-hosts/$host.name$?kqlQuery=(filterQuery:(expression:'process.name%20:%20%22$process.name$%22',kind:kuery),queryLocation:hosts.details,type:details)&timerange=(global:(linkTo:!(timeline),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')),timeline:(linkTo:!(global),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')))",
              },
              {
                url_name: 'Host Details by user name',
                url_value:
                  "siem#/ml-hosts/$host.name$?kqlQuery=(filterQuery:(expression:'user.name%20:%20%22$user.name$%22',kind:kuery),queryLocation:hosts.details,type:details)&timerange=(global:(linkTo:!(timeline),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')),timeline:(linkTo:!(global),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')))",
              },
              {
                url_name: 'Hosts Overview by process name',
                url_value:
                  "siem#/ml-hosts?kqlQuery=(filterQuery:(expression:'process.name%20:%20%22$process.name$%22',kind:kuery),queryLocation:hosts.page,type:page)&timerange=(global:(linkTo:!(timeline),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')),timeline:(linkTo:!(global),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')))",
              },
              {
                url_name: 'Hosts Overview by user name',
                url_value:
                  "siem#/ml-hosts?kqlQuery=(filterQuery:(expression:'user.name%20:%20%22$user.name$%22',kind:kuery),queryLocation:hosts.page,type:page)&timerange=(global:(linkTo:!(timeline),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')),timeline:(linkTo:!(global),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')))",
              },
            ],
          },
        },
      },
    ],
    datafeeds: [
      {
        id: 'datafeed-windows_anomalous_path_activity_ecs',
        config: {
          job_id: 'windows_anomalous_path_activity_ecs',
          indices: ['INDEX_PATTERN_NAME'],
          query: {
            bool: {
              filter: [
                { term: { 'event.action': 'Process Create (rule: ProcessCreate)' } },
                { term: { 'agent.type': 'winlogbeat' } },
              ],
            },
          },
        },
      },
      {
        id: 'datafeed-windows_anomalous_network_activity_ecs',
        config: {
          job_id: 'windows_anomalous_network_activity_ecs',
          indices: ['INDEX_PATTERN_NAME'],
          query: {
            bool: {
              filter: [
                { term: { 'event.action': 'Network connection detected (rule: NetworkConnect)' } },
                { term: { 'agent.type': 'winlogbeat' } },
              ],
              must_not: [
                {
                  bool: {
                    should: [
                      { term: { 'destination.ip': '127.0.0.1' } },
                      { term: { 'destination.ip': '127.0.0.53' } },
                      { term: { 'destination.ip': '::1' } },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
        },
      },
    ],
    kibana: {},
  },
];

export const checkRecognizerSuccess: RecognizerModule[] = [
  {
    id: 'security_linux_v3',
    title: 'SIEM Auditbeat',
    query: { bool: { filter: [{ term: { 'agent.type': 'auditbeat' } }] } },
    description:
      'Detect suspicious network activity and unusual processes in Auditbeat data (beta)',
    logo: { icon: 'securityAnalyticsApp' },
  },
];

export const mockSecurityJobs: SecurityJob[] = [
  {
    id: 'linux_anomalous_network_activity_ecs',
    description:
      'SIEM Auditbeat: Looks for unusual processes using the network which could indicate command-and-control, lateral movement, persistence, or data exfiltration activity (beta)',
    groups: ['auditbeat', 'process', 'siem'],
    processed_record_count: 32010,
    memory_status: 'ok',
    jobState: 'closed',
    hasDatafeed: true,
    datafeedId: 'datafeed-linux_anomalous_network_activity_ecs',
    datafeedIndices: ['auditbeat-*'],
    datafeedState: 'stopped',
    latestTimestampMs: 1571022859393,
    earliestTimestampMs: 1569812391387,
    latestResultsTimestampMs: 1571022900000,
    isSingleMetricViewerJob: true,
    moduleId: 'security_linux_v3',
    defaultIndexPattern: 'auditbeat-*',
    isCompatible: true,
    isInstalled: true,
    isElasticJob: true,
    awaitingNodeAssignment: false,
    jobTags: {},
    bucketSpanSeconds: 900,
  },
  {
    id: 'rare_process_by_host_linux_ecs',
    description: 'SIEM Auditbeat: Detect unusually rare processes on Linux (beta)',
    groups: ['auditbeat', 'process', 'siem'],
    processed_record_count: 0,
    memory_status: 'ok',
    jobState: 'closed',
    hasDatafeed: true,
    datafeedId: 'datafeed-rare_process_by_host_linux_ecs',
    datafeedIndices: ['auditbeat-*'],
    datafeedState: 'stopped',
    isSingleMetricViewerJob: true,
    moduleId: 'security_linux_v3',
    defaultIndexPattern: 'auditbeat-*',
    isCompatible: true,
    isInstalled: true,
    isElasticJob: true,
    awaitingNodeAssignment: false,
    jobTags: {},
    bucketSpanSeconds: 900,
  },
  {
    datafeedId: '',
    datafeedIndices: [],
    datafeedState: '',
    hasDatafeed: false,
    isSingleMetricViewerJob: false,
    jobState: 'closed',
    memory_status: '',
    processed_record_count: 0,
    id: 'rare_process_by_host_windows_ecs',
    description: 'SIEM Winlogbeat: Detect unusually rare processes on Windows (beta)',
    groups: ['process', 'siem', 'winlogbeat'],
    defaultIndexPattern: 'winlogbeat-*',
    moduleId: 'security_windows_v3',
    isCompatible: false,
    isInstalled: false,
    isElasticJob: true,
    awaitingNodeAssignment: false,
    jobTags: {},
    bucketSpanSeconds: 900,
  },
];
