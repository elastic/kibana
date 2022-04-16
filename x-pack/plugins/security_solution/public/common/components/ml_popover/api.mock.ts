/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlSummaryJob } from '@kbn/ml-plugin/public';
import {
  Group,
  Module,
  RecognizerModule,
  SetupMlResponse,
  SecurityJob,
  StartDatafeedResponse,
  StopDatafeedResponse,
} from './types';

export const mockGroupsResponse: Group[] = [
  {
    id: 'siem',
    jobIds: [
      'rc-original-suspicious-login-activity-2',
      'rc-rare-process-linux-7',
      'rc-rare-process-windows-5',
      'siem-api-rare_process_linux_ecs',
      'siem-api-rare_process_windows_ecs',
      'siem-api-suspicious_login_activity_ecs',
    ],
    calendarIds: [],
  },
  { id: 'suricata', jobIds: ['suricata_alert_rate'], calendarIds: [] },
];

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
    id: 'siem_auditbeat',
    title: 'SIEM Auditbeat',
    description:
      'Detect suspicious network activity and unusual processes in Auditbeat data (beta)',
    type: 'Auditbeat data',
    logoFile: 'logo.json',
    defaultIndexPattern: 'auditbeat-*',
    query: { bool: { filter: [{ term: { 'agent.type': 'auditbeat' } }] } },
    jobs: [
      {
        id: 'rare_process_by_host_linux_ecs',
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
    id: 'siem_winlogbeat',
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
    id: 'siem_auditbeat',
    title: 'SIEM Auditbeat',
    query: { bool: { filter: [{ term: { 'agent.type': 'auditbeat' } }] } },
    description:
      'Detect suspicious network activity and unusual processes in Auditbeat data (beta)',
    logo: { icon: 'securityAnalyticsApp' },
  },
];

export const mockSetupMlJobAllError: SetupMlResponse = {
  jobs: [
    {
      id: 'linux_anomalous_network_url_activity_ecs',
      success: false,
      error: {
        msg: "[resource_already_exists_exception] The job cannot be created with the Id 'linux_anomalous_network_url_activity_ecs'. The Id is already used.",
        path: '/_ml/anomaly_detectors/linux_anomalous_network_url_activity_ecs',
        query: {},
        body: '{"job_type":"anomaly_detector","groups":["siem","auditbeat","process"],"description":"SIEM Auditbeat: Looks for an unusual web URL request from a Linux instance. Curl and wget web request activity is very common but unusual web requests from a Linux server can sometimes be malware delivery or execution (beta)","analysis_config":{"bucket_span":"15m","detectors":[{"detector_description":"rare by \\"process.title\\"","function":"rare","by_field_name":"process.title"}],"influencers":["host.name","destination.ip","destination.port"]},"analysis_limits":{"model_memory_limit":"32mb"},"data_description":{"time_field":"@timestamp"},"custom_settings":{"created_by":"ml-module-siem-auditbeat","custom_urls":[{"url_name":"Host Details","url_value":"siem#/ml-hosts/$host.name$?timerange=(global:(linkTo:!(timeline),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')),timeline:(linkTo:!(global),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')))"}]},"results_index_name":"linux_anomalous_network_url_activity_ecs"}',
        statusCode: 400,
        response:
          '{"error":{"root_cause":[{"type":"resource_already_exists_exception","reason":"The job cannot be created with the Id \'linux_anomalous_network_url_activity_ecs\'. The Id is already used."}],"type":"resource_already_exists_exception","reason":"The job cannot be created with the Id \'linux_anomalous_network_url_activity_ecs\'. The Id is already used."},"status":400}',
      },
    },
    {
      id: 'linux_anomalous_network_port_activity_ecs',
      success: false,
      error: {
        msg: "[resource_already_exists_exception] The job cannot be created with the Id 'linux_anomalous_network_port_activity_ecs'. The Id is already used.",
        path: '/_ml/anomaly_detectors/linux_anomalous_network_port_activity_ecs',
        query: {},
        body: '{"job_type":"anomaly_detector","description":"SIEM Auditbeat: Looks for unusual destination port activity that could indicate command-and-control, persistence mechanism, or data exfiltration activity (beta)","groups":["siem","auditbeat","process"],"analysis_config":{"bucket_span":"15m","detectors":[{"detector_description":"rare by \\"destination.port\\"","function":"rare","by_field_name":"destination.port"}],"influencers":["host.name","process.name","user.name","destination.ip"]},"analysis_limits":{"model_memory_limit":"32mb"},"data_description":{"time_field":"@timestamp"},"custom_settings":{"created_by":"ml-module-siem-auditbeat","custom_urls":[{"url_name":"Host Details by process name","url_value":"siem#/ml-hosts/$host.name$?kqlQuery=(filterQuery:(expression:\'process.name%20:%20%22$process.name$%22\',kind:kuery),queryLocation:hosts.details,type:details)&timerange=(global:(linkTo:!(timeline),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')),timeline:(linkTo:!(global),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')))"},{"url_name":"Host Details by user name","url_value":"siem#/ml-hosts/$host.name$?kqlQuery=(filterQuery:(expression:\'user.name%20:%20%22$user.name$%22\',kind:kuery),queryLocation:hosts.details,type:details)&timerange=(global:(linkTo:!(timeline),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')),timeline:(linkTo:!(global),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')))"},{"url_name":"Hosts Overview by process name","url_value":"siem#/ml-hosts?kqlQuery=(filterQuery:(expression:\'process.name%20:%20%22$process.name$%22\',kind:kuery),queryLocation:hosts.page,type:page)&timerange=(global:(linkTo:!(timeline),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')),timeline:(linkTo:!(global),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')))"},{"url_name":"Hosts Overview by user name","url_value":"siem#/ml-hosts?kqlQuery=(filterQuery:(expression:\'user.name%20:%20%22$user.name$%22\',kind:kuery),queryLocation:hosts.page,type:page)&timerange=(global:(linkTo:!(timeline),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')),timeline:(linkTo:!(global),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')))"}]},"results_index_name":"linux_anomalous_network_port_activity_ecs"}',
        statusCode: 400,
        response:
          '{"error":{"root_cause":[{"type":"resource_already_exists_exception","reason":"The job cannot be created with the Id \'linux_anomalous_network_port_activity_ecs\'. The Id is already used."}],"type":"resource_already_exists_exception","reason":"The job cannot be created with the Id \'linux_anomalous_network_port_activity_ecs\'. The Id is already used."},"status":400}',
      },
    },
  ],
  datafeeds: [
    {
      id: 'datafeed-linux_anomalous_network_activity_ecs',
      success: false,
      started: false,
      error: {
        msg: '[status_exception] A datafeed [datafeed-linux_anomalous_network_activity_ecs] already exists for job [linux_anomalous_network_activity_ecs]',
        path: '/_ml/datafeeds/datafeed-linux_anomalous_network_activity_ecs',
        query: {},
        body: '{"job_id":"linux_anomalous_network_activity_ecs","indices":["auditbeat-*"],"query":{"bool":{"filter":[{"term":{"event.action":"connected-to"}},{"term":{"agent.type":"auditbeat"}}],"must_not":[{"bool":{"should":[{"term":{"destination.ip":"127.0.0.1"}},{"term":{"destination.ip":"127.0.0.53"}},{"term":{"destination.ip":"::1"}}],"minimum_should_match":1}}]}}}',
        statusCode: 409,
        response:
          '{"error":{"root_cause":[{"type":"status_exception","reason":"A datafeed [datafeed-linux_anomalous_network_activity_ecs] already exists for job [linux_anomalous_network_activity_ecs]"}],"type":"status_exception","reason":"A datafeed [datafeed-linux_anomalous_network_activity_ecs] already exists for job [linux_anomalous_network_activity_ecs]"},"status":409}',
      },
    },
    {
      id: 'datafeed-linux_anomalous_network_port_activity_ecs',
      success: false,
      started: false,
      error: {
        msg: '[status_exception] A datafeed [datafeed-linux_anomalous_network_port_activity_ecs] already exists for job [linux_anomalous_network_port_activity_ecs]',
        path: '/_ml/datafeeds/datafeed-linux_anomalous_network_port_activity_ecs',
        query: {},
        body: '{"job_id":"linux_anomalous_network_port_activity_ecs","indices":["auditbeat-*"],"query":{"bool":{"filter":[{"term":{"event.action":"connected-to"}},{"term":{"agent.type":"auditbeat"}}],"must_not":[{"bool":{"should":[{"term":{"destination.ip":"::1"}},{"term":{"destination.ip":"127.0.0.1"}},{"term":{"destination.ip":"::"}},{"term":{"user.name_map.uid":"jenkins"}}],"minimum_should_match":1}}]}}}',
        statusCode: 409,
        response:
          '{"error":{"root_cause":[{"type":"status_exception","reason":"A datafeed [datafeed-linux_anomalous_network_port_activity_ecs] already exists for job [linux_anomalous_network_port_activity_ecs]"}],"type":"status_exception","reason":"A datafeed [datafeed-linux_anomalous_network_port_activity_ecs] already exists for job [linux_anomalous_network_port_activity_ecs]"},"status":409}',
      },
    },
  ],
  kibana: {},
};

export const mockSetupMlJobSingleErrorSingleSuccess: SetupMlResponse = {
  jobs: [
    {
      id: 'linux_anomalous_network_activity_ecs',
      success: false,
      error: {
        msg: "[resource_already_exists_exception] The job cannot be created with the Id 'linux_anomalous_network_activity_ecs'. The Id is already used.",
        path: '/_ml/anomaly_detectors/linux_anomalous_network_activity_ecs',
        query: {},
        body: '{"job_type":"anomaly_detector","description":"SIEM Auditbeat: Looks for unusual processes using the network which could indicate command-and-control, lateral movement, persistence, or data exfiltration activity (beta)","groups":["siem","auditbeat","network"],"analysis_config":{"bucket_span":"15m","detectors":[{"detector_description":"rare by \\"process.name\\"","function":"rare","by_field_name":"process.name"}],"influencers":["host.name","process.name","user.name","destination.ip"]},"analysis_limits":{"model_memory_limit":"64mb"},"data_description":{"time_field":"@timestamp"},"custom_settings":{"created_by":"ml-module-siem-auditbeat","custom_urls":[{"url_name":"Host Details by process name","url_value":"siem#/ml-hosts/$host.name$?kqlQuery=(filterQuery:(expression:\'process.name%20:%20%22$process.name$%22\',kind:kuery),queryLocation:hosts.details,type:details)&timerange=(global:(linkTo:!(timeline),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')),timeline:(linkTo:!(global),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')))"},{"url_name":"Host Details by user name","url_value":"siem#/ml-hosts/$host.name$?kqlQuery=(filterQuery:(expression:\'user.name%20:%20%22$user.name$%22\',kind:kuery),queryLocation:hosts.details,type:details)&timerange=(global:(linkTo:!(timeline),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')),timeline:(linkTo:!(global),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')))"},{"url_name":"Hosts Overview by process name","url_value":"siem#/ml-hosts?kqlQuery=(filterQuery:(expression:\'process.name%20:%20%22$process.name$%22\',kind:kuery),queryLocation:hosts.page,type:page)&timerange=(global:(linkTo:!(timeline),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')),timeline:(linkTo:!(global),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')))"},{"url_name":"Hosts Overview by user name","url_value":"siem#/ml-hosts?kqlQuery=(filterQuery:(expression:\'user.name%20:%20%22$user.name$%22\',kind:kuery),queryLocation:hosts.page,type:page)&timerange=(global:(linkTo:!(timeline),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')),timeline:(linkTo:!(global),timerange:(from:\'$earliest$\',kind:absolute,to:\'$latest$\')))"}]},"results_index_name":"linux_anomalous_network_activity_ecs"}',
        statusCode: 400,
        response:
          '{"error":{"root_cause":[{"type":"resource_already_exists_exception","reason":"The job cannot be created with the Id \'linux_anomalous_network_activity_ecs\'. The Id is already used."}],"type":"resource_already_exists_exception","reason":"The job cannot be created with the Id \'linux_anomalous_network_activity_ecs\'. The Id is already used."},"status":400}',
      },
    },
    { id: 'linux_anomalous_network_port_activity_ecs', success: true },
  ],
  datafeeds: [
    {
      id: 'datafeed-linux_anomalous_network_activity_ecs',
      success: false,
      started: false,
      error: {
        msg: '[status_exception] A datafeed [datafeed-linux_anomalous_network_activity_ecs] already exists for job [linux_anomalous_network_activity_ecs]',
        path: '/_ml/datafeeds/datafeed-linux_anomalous_network_activity_ecs',
        query: {},
        body: '{"job_id":"linux_anomalous_network_activity_ecs","indices":["auditbeat-*"],"query":{"bool":{"filter":[{"term":{"event.action":"connected-to"}},{"term":{"agent.type":"auditbeat"}}],"must_not":[{"bool":{"should":[{"term":{"destination.ip":"127.0.0.1"}},{"term":{"destination.ip":"127.0.0.53"}},{"term":{"destination.ip":"::1"}}],"minimum_should_match":1}}]}}}',
        statusCode: 409,
        response:
          '{"error":{"root_cause":[{"type":"status_exception","reason":"A datafeed [datafeed-linux_anomalous_network_activity_ecs] already exists for job [linux_anomalous_network_activity_ecs]"}],"type":"status_exception","reason":"A datafeed [datafeed-linux_anomalous_network_activity_ecs] already exists for job [linux_anomalous_network_activity_ecs]"},"status":409}',
      },
    },

    { id: 'datafeed-linux_anomalous_network_port_activity_ecs', success: true, started: false },
  ],
  kibana: {},
};

export const mockSetupMlJobAllSuccess: SetupMlResponse = {
  jobs: [
    {
      id: 'linux_anomalous_network_activity_ecs',
      success: true,
    },
    { id: 'linux_anomalous_network_port_activity_ecs', success: true },
  ],
  datafeeds: [
    { id: 'datafeed-linux_anomalous_network_activity_ecs', success: true, started: false },

    { id: 'datafeed-linux_anomalous_network_port_activity_ecs', success: true, started: false },
  ],
  kibana: {},
};

export const mockStartDatafeedsError: StartDatafeedResponse = {
  'datafeed-linux_anomalous_network_service': { started: false, error: 'Job has no datafeed' },
};

export const mockStartDatafeedsSuccess: StartDatafeedResponse = {
  'datafeed-linux_anomalous_network_service': { started: true },
};

export const mockStopDatafeedsErrorDoesNotExist: StopDatafeedResponse = {};

export const mockStopDatafeedsSuccess: StopDatafeedResponse = {
  'datafeed-linux_anomalous_network_service': { stopped: true },
};

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
    moduleId: 'siem_auditbeat',
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
    moduleId: 'siem_auditbeat',
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
    jobState: '',
    memory_status: '',
    processed_record_count: 0,
    id: 'rare_process_by_host_windows_ecs',
    description: 'SIEM Winlogbeat: Detect unusually rare processes on Windows (beta)',
    groups: ['process', 'siem', 'winlogbeat'],
    defaultIndexPattern: 'winlogbeat-*',
    moduleId: 'siem_winlogbeat',
    isCompatible: false,
    isInstalled: false,
    isElasticJob: true,
    awaitingNodeAssignment: false,
    jobTags: {},
    bucketSpanSeconds: 900,
  },
];
