/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import { allowedExperimentalValues } from '../../../../../../../common/experimental_features';

import {
  Direction,
  HostAggEsItem,
  HostsFields,
  HostsQueries,
  HostsRequestOptions,
} from '../../../../../../../common/search_strategy';
import { EndpointAppContextService } from '../../../../../../endpoint/endpoint_app_context_services';
import { EndpointAppContext } from '../../../../../../endpoint/types';

export const mockOptions: HostsRequestOptions = {
  defaultIndex: [
    'apm-*-transaction*',
    'traces-apm*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  docValueFields: [
    { field: '@timestamp', format: 'date_time' },
    { field: 'event.created', format: 'date_time' },
    { field: 'event.end', format: 'date_time' },
    { field: 'event.ingested', format: 'date_time' },
    { field: 'event.start', format: 'date_time' },
    { field: 'file.accessed', format: 'date_time' },
    { field: 'file.created', format: 'date_time' },
    { field: 'file.ctime', format: 'date_time' },
    { field: 'file.mtime', format: 'date_time' },
    { field: 'package.installed', format: 'date_time' },
    { field: 'process.parent.start', format: 'date_time' },
    { field: 'process.start', format: 'date_time' },
    { field: 'system.audit.host.boottime', format: 'date_time' },
    { field: 'system.audit.package.installtime', format: 'date_time' },
    { field: 'system.audit.user.password.last_changed', format: 'date_time' },
    { field: 'tls.client.not_after', format: 'date_time' },
    { field: 'tls.client.not_before', format: 'date_time' },
    { field: 'tls.server.not_after', format: 'date_time' },
    { field: 'tls.server.not_before', format: 'date_time' },
    { field: 'aws.cloudtrail.user_identity.session_context.creation_date', format: 'date_time' },
    { field: 'azure.auditlogs.properties.activity_datetime', format: 'date_time' },
    { field: 'azure.enqueued_time', format: 'date_time' },
    { field: 'azure.signinlogs.properties.created_at', format: 'date_time' },
    { field: 'cef.extensions.agentReceiptTime', format: 'date_time' },
    { field: 'cef.extensions.deviceCustomDate1', format: 'date_time' },
    { field: 'cef.extensions.deviceCustomDate2', format: 'date_time' },
    { field: 'cef.extensions.deviceReceiptTime', format: 'date_time' },
    { field: 'cef.extensions.endTime', format: 'date_time' },
    { field: 'cef.extensions.fileCreateTime', format: 'date_time' },
    { field: 'cef.extensions.fileModificationTime', format: 'date_time' },
    { field: 'cef.extensions.flexDate1', format: 'date_time' },
    { field: 'cef.extensions.managerReceiptTime', format: 'date_time' },
    { field: 'cef.extensions.oldFileCreateTime', format: 'date_time' },
    { field: 'cef.extensions.oldFileModificationTime', format: 'date_time' },
    { field: 'cef.extensions.startTime', format: 'date_time' },
    { field: 'checkpoint.subs_exp', format: 'date_time' },
    { field: 'crowdstrike.event.EndTimestamp', format: 'date_time' },
    { field: 'crowdstrike.event.IncidentEndTime', format: 'date_time' },
    { field: 'crowdstrike.event.IncidentStartTime', format: 'date_time' },
    { field: 'crowdstrike.event.ProcessEndTime', format: 'date_time' },
    { field: 'crowdstrike.event.ProcessStartTime', format: 'date_time' },
    { field: 'crowdstrike.event.StartTimestamp', format: 'date_time' },
    { field: 'crowdstrike.event.Timestamp', format: 'date_time' },
    { field: 'crowdstrike.event.UTCTimestamp', format: 'date_time' },
    { field: 'crowdstrike.metadata.eventCreationTime', format: 'date_time' },
    { field: 'gsuite.admin.email.log_search_filter.end_date', format: 'date_time' },
    { field: 'gsuite.admin.email.log_search_filter.start_date', format: 'date_time' },
    { field: 'gsuite.admin.user.birthdate', format: 'date_time' },
    { field: 'kafka.block_timestamp', format: 'date_time' },
    { field: 'microsoft.defender_atp.lastUpdateTime', format: 'date_time' },
    { field: 'microsoft.defender_atp.resolvedTime', format: 'date_time' },
    { field: 'misp.campaign.first_seen', format: 'date_time' },
    { field: 'misp.campaign.last_seen', format: 'date_time' },
    { field: 'misp.intrusion_set.first_seen', format: 'date_time' },
    { field: 'misp.intrusion_set.last_seen', format: 'date_time' },
    { field: 'misp.observed_data.first_observed', format: 'date_time' },
    { field: 'misp.observed_data.last_observed', format: 'date_time' },
    { field: 'misp.report.published', format: 'date_time' },
    { field: 'misp.threat_indicator.valid_from', format: 'date_time' },
    { field: 'misp.threat_indicator.valid_until', format: 'date_time' },
    { field: 'netflow.collection_time_milliseconds', format: 'date_time' },
    { field: 'netflow.exporter.timestamp', format: 'date_time' },
    { field: 'netflow.flow_end_microseconds', format: 'date_time' },
    { field: 'netflow.flow_end_milliseconds', format: 'date_time' },
    { field: 'netflow.flow_end_nanoseconds', format: 'date_time' },
    { field: 'netflow.flow_end_seconds', format: 'date_time' },
    { field: 'netflow.flow_start_microseconds', format: 'date_time' },
    { field: 'netflow.flow_start_milliseconds', format: 'date_time' },
    { field: 'netflow.flow_start_nanoseconds', format: 'date_time' },
    { field: 'netflow.flow_start_seconds', format: 'date_time' },
    { field: 'netflow.max_export_seconds', format: 'date_time' },
    { field: 'netflow.max_flow_end_microseconds', format: 'date_time' },
    { field: 'netflow.max_flow_end_milliseconds', format: 'date_time' },
    { field: 'netflow.max_flow_end_nanoseconds', format: 'date_time' },
    { field: 'netflow.max_flow_end_seconds', format: 'date_time' },
    { field: 'netflow.min_export_seconds', format: 'date_time' },
    { field: 'netflow.min_flow_start_microseconds', format: 'date_time' },
    { field: 'netflow.min_flow_start_milliseconds', format: 'date_time' },
    { field: 'netflow.min_flow_start_nanoseconds', format: 'date_time' },
    { field: 'netflow.min_flow_start_seconds', format: 'date_time' },
    { field: 'netflow.monitoring_interval_end_milli_seconds', format: 'date_time' },
    { field: 'netflow.monitoring_interval_start_milli_seconds', format: 'date_time' },
    { field: 'netflow.observation_time_microseconds', format: 'date_time' },
    { field: 'netflow.observation_time_milliseconds', format: 'date_time' },
    { field: 'netflow.observation_time_nanoseconds', format: 'date_time' },
    { field: 'netflow.observation_time_seconds', format: 'date_time' },
    { field: 'netflow.system_init_time_milliseconds', format: 'date_time' },
    { field: 'rsa.internal.lc_ctime', format: 'date_time' },
    { field: 'rsa.internal.time', format: 'date_time' },
    { field: 'rsa.time.effective_time', format: 'date_time' },
    { field: 'rsa.time.endtime', format: 'date_time' },
    { field: 'rsa.time.event_queue_time', format: 'date_time' },
    { field: 'rsa.time.event_time', format: 'date_time' },
    { field: 'rsa.time.expire_time', format: 'date_time' },
    { field: 'rsa.time.recorded_time', format: 'date_time' },
    { field: 'rsa.time.stamp', format: 'date_time' },
    { field: 'rsa.time.starttime', format: 'date_time' },
    { field: 'sophos.xg.date', format: 'date_time' },
    { field: 'sophos.xg.eventtime', format: 'date_time' },
    { field: 'sophos.xg.start_time', format: 'date_time' },
  ],
  factoryQueryType: HostsQueries.hosts,
  filterQuery: '{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}}',
  pagination: { activePage: 0, cursorStart: 0, fakePossibleCount: 50, querySize: 10 },
  timerange: { interval: '12h', from: '2020-09-03T09:15:21.415Z', to: '2020-09-04T09:15:21.415Z' },
  sort: { direction: Direction.desc, field: HostsFields.lastSeen },
};

export const mockSearchStrategyResponse: IEsSearchResponse<unknown> = {
  isPartial: false,
  isRunning: false,
  rawResponse: {
    took: 169,
    timed_out: false,
    _shards: { total: 21, successful: 21, skipped: 0, failed: 0 },
    hits: { total: -1, max_score: 0, hits: [] },
    aggregations: {
      host_data: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          {
            key: 'bastion00.siem.estc.dev',
            doc_count: 774875,
            lastSeen: { value: 1599210921410, value_as_string: '2020-09-04T09:15:21.410Z' },
            os: {
              hits: {
                total: 774875,
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: 'f6NmWHQBA6bGZw2uJepK',
                    _score: null,
                    _source: {},
                    sort: [1599210921410],
                  },
                ],
              },
            },
          },
          {
            key: 'es02.siem.estc.dev',
            doc_count: 10496,
            lastSeen: { value: 1599210907990, value_as_string: '2020-09-04T09:15:07.990Z' },
            os: {
              hits: {
                total: 10496,
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: '4_lmWHQBc39KFIJbFdYv',
                    _score: null,
                    _source: {},
                    sort: [1599210907990],
                  },
                ],
              },
            },
          },
          {
            key: 'es00.siem.estc.dev',
            doc_count: 19722,
            lastSeen: { value: 1599210906783, value_as_string: '2020-09-04T09:15:06.783Z' },
            os: {
              hits: {
                total: 19722,
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: 'z_lmWHQBc39KFIJbAdZP',
                    _score: null,
                    _source: {},
                    sort: [1599210906783],
                  },
                ],
              },
            },
          },
          {
            key: 'es01.siem.estc.dev',
            doc_count: 16770,
            lastSeen: { value: 1599210900781, value_as_string: '2020-09-04T09:15:00.781Z' },
            os: {
              hits: {
                total: 16770,
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: 'uPllWHQBc39KFIJb6tbR',
                    _score: null,
                    _source: {},
                    sort: [1599210900781],
                  },
                ],
              },
            },
          },
          {
            key: 'siem-windows',
            doc_count: 1941,
            lastSeen: { value: 1599210880354, value_as_string: '2020-09-04T09:14:40.354Z' },
            os: {
              hits: {
                total: 1941,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: '56NlWHQBA6bGZw2uiOfb',
                    _score: null,
                    _source: {
                      host: {
                        os: {
                          build: '17763.1397',
                          kernel: '10.0.17763.1397 (WinBuild.160101.0800)',
                          name: 'Windows Server 2019 Datacenter',
                          family: 'windows',
                          version: '10.0',
                          platform: 'windows',
                        },
                      },
                    },
                    sort: [1599210880354],
                  },
                ],
              },
            },
          },
          {
            key: 'filebeat-cloud',
            doc_count: 50,
            lastSeen: { value: 1599207421000, value_as_string: '2020-09-04T08:17:01.000Z' },
            os: {
              hits: {
                total: 50,
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: 'FKMwWHQBA6bGZw2uw5Z3',
                    _score: null,
                    _source: {},
                    sort: [1599207421000],
                  },
                ],
              },
            },
          },
          {
            key: 'kibana00.siem.estc.dev',
            doc_count: 50,
            lastSeen: { value: 1599207421000, value_as_string: '2020-09-04T08:17:01.000Z' },
            os: {
              hits: {
                total: 50,
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: 'MKMwWHQBA6bGZw2u0ZZw',
                    _score: null,
                    _source: {},
                    sort: [1599207421000],
                  },
                ],
              },
            },
          },
          {
            key: 'DESKTOP-QBBSCUT',
            doc_count: 128973,
            lastSeen: { value: 1599150487957, value_as_string: '2020-09-03T16:28:07.957Z' },
            os: {
              hits: {
                total: 128973,
                max_score: 0,
                hits: [
                  {
                    _index: '.ds-logs-elastic.agent-default-000001',
                    _id: 'tvTLVHQBc39KFIJb_ykQ',
                    _score: null,
                    _source: {
                      host: {
                        os: {
                          build: '18362.1016',
                          kernel: '10.0.18362.1016 (WinBuild.160101.0800)',
                          name: 'Windows 10 Pro',
                          family: 'windows',
                          version: '10.0',
                          platform: 'windows',
                        },
                      },
                    },
                    sort: [1599150487957],
                  },
                ],
              },
            },
          },
          {
            key: 'mainqa-atlcolo-10-0-7-195.eng.endgames.local',
            doc_count: 21213,
            lastSeen: { value: 1599150457515, value_as_string: '2020-09-03T16:27:37.515Z' },
            os: {
              hits: {
                total: 21213,
                max_score: 0,
                hits: [
                  {
                    _index: '.ds-logs-endpoint.events.network-default-000001',
                    _id: 'efTLVHQBc39KFIJbiCgD',
                    _score: null,
                    _source: {
                      host: {
                        os: {
                          Ext: { variant: 'macOS' },
                          kernel:
                            'Darwin Kernel Version 18.2.0: Fri Oct  5 19:40:55 PDT 2018; root:xnu-4903.221.2~1/RELEASE_X86_64',
                          name: 'macOS',
                          family: 'macos',
                          version: '10.14.1',
                          platform: 'macos',
                          full: 'macOS 10.14.1',
                        },
                      },
                    },
                    sort: [1599150457515],
                  },
                ],
              },
            },
          },
        ],
      },
      host_count: { value: 9 },
    },
  },
  total: 21,
  loaded: 21,
};

export const formattedSearchStrategyResponse = {
  isPartial: false,
  isRunning: false,
  rawResponse: {
    took: 169,
    timed_out: false,
    _shards: { total: 21, successful: 21, skipped: 0, failed: 0 },
    hits: { total: -1, max_score: 0, hits: [] },
    aggregations: {
      host_data: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          {
            key: 'bastion00.siem.estc.dev',
            doc_count: 774875,
            lastSeen: { value: 1599210921410, value_as_string: '2020-09-04T09:15:21.410Z' },
            os: {
              hits: {
                total: 774875,
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: 'f6NmWHQBA6bGZw2uJepK',
                    _score: null,
                    _source: {},
                    sort: [1599210921410],
                  },
                ],
              },
            },
          },
          {
            key: 'es02.siem.estc.dev',
            doc_count: 10496,
            lastSeen: { value: 1599210907990, value_as_string: '2020-09-04T09:15:07.990Z' },
            os: {
              hits: {
                total: 10496,
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: '4_lmWHQBc39KFIJbFdYv',
                    _score: null,
                    _source: {},
                    sort: [1599210907990],
                  },
                ],
              },
            },
          },
          {
            key: 'es00.siem.estc.dev',
            doc_count: 19722,
            lastSeen: { value: 1599210906783, value_as_string: '2020-09-04T09:15:06.783Z' },
            os: {
              hits: {
                total: 19722,
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: 'z_lmWHQBc39KFIJbAdZP',
                    _score: null,
                    _source: {},
                    sort: [1599210906783],
                  },
                ],
              },
            },
          },
          {
            key: 'es01.siem.estc.dev',
            doc_count: 16770,
            lastSeen: { value: 1599210900781, value_as_string: '2020-09-04T09:15:00.781Z' },
            os: {
              hits: {
                total: 16770,
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: 'uPllWHQBc39KFIJb6tbR',
                    _score: null,
                    _source: {},
                    sort: [1599210900781],
                  },
                ],
              },
            },
          },
          {
            key: 'siem-windows',
            doc_count: 1941,
            lastSeen: { value: 1599210880354, value_as_string: '2020-09-04T09:14:40.354Z' },
            os: {
              hits: {
                total: 1941,
                max_score: 0,
                hits: [
                  {
                    _index: 'winlogbeat-8.0.0-2020.09.02-000001',
                    _id: '56NlWHQBA6bGZw2uiOfb',
                    _score: null,
                    _source: {
                      host: {
                        os: {
                          build: '17763.1397',
                          kernel: '10.0.17763.1397 (WinBuild.160101.0800)',
                          name: 'Windows Server 2019 Datacenter',
                          family: 'windows',
                          version: '10.0',
                          platform: 'windows',
                        },
                      },
                    },
                    sort: [1599210880354],
                  },
                ],
              },
            },
          },
          {
            key: 'filebeat-cloud',
            doc_count: 50,
            lastSeen: { value: 1599207421000, value_as_string: '2020-09-04T08:17:01.000Z' },
            os: {
              hits: {
                total: 50,
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: 'FKMwWHQBA6bGZw2uw5Z3',
                    _score: null,
                    _source: {},
                    sort: [1599207421000],
                  },
                ],
              },
            },
          },
          {
            key: 'kibana00.siem.estc.dev',
            doc_count: 50,
            lastSeen: { value: 1599207421000, value_as_string: '2020-09-04T08:17:01.000Z' },
            os: {
              hits: {
                total: 50,
                max_score: 0,
                hits: [
                  {
                    _index: 'filebeat-8.0.0-2020.09.02-000001',
                    _id: 'MKMwWHQBA6bGZw2u0ZZw',
                    _score: null,
                    _source: {},
                    sort: [1599207421000],
                  },
                ],
              },
            },
          },
          {
            key: 'DESKTOP-QBBSCUT',
            doc_count: 128973,
            lastSeen: { value: 1599150487957, value_as_string: '2020-09-03T16:28:07.957Z' },
            os: {
              hits: {
                total: 128973,
                max_score: 0,
                hits: [
                  {
                    _index: '.ds-logs-elastic.agent-default-000001',
                    _id: 'tvTLVHQBc39KFIJb_ykQ',
                    _score: null,
                    _source: {
                      host: {
                        os: {
                          build: '18362.1016',
                          kernel: '10.0.18362.1016 (WinBuild.160101.0800)',
                          name: 'Windows 10 Pro',
                          family: 'windows',
                          version: '10.0',
                          platform: 'windows',
                        },
                      },
                    },
                    sort: [1599150487957],
                  },
                ],
              },
            },
          },
          {
            key: 'mainqa-atlcolo-10-0-7-195.eng.endgames.local',
            doc_count: 21213,
            lastSeen: { value: 1599150457515, value_as_string: '2020-09-03T16:27:37.515Z' },
            os: {
              hits: {
                total: 21213,
                max_score: 0,
                hits: [
                  {
                    _index: '.ds-logs-endpoint.events.network-default-000001',
                    _id: 'efTLVHQBc39KFIJbiCgD',
                    _score: null,
                    _source: {
                      host: {
                        os: {
                          Ext: { variant: 'macOS' },
                          kernel:
                            'Darwin Kernel Version 18.2.0: Fri Oct  5 19:40:55 PDT 2018; root:xnu-4903.221.2~1/RELEASE_X86_64',
                          name: 'macOS',
                          family: 'macos',
                          version: '10.14.1',
                          platform: 'macos',
                          full: 'macOS 10.14.1',
                        },
                      },
                    },
                    sort: [1599150457515],
                  },
                ],
              },
            },
          },
        ],
      },
      host_count: { value: 9 },
    },
  },
  total: 21,
  loaded: 21,
  inspect: {
    dsl: [
      JSON.stringify(
        {
          allow_no_indices: true,
          index: [
            'apm-*-transaction*',
            'traces-apm*',
            'auditbeat-*',
            'endgame-*',
            'filebeat-*',
            'logs-*',
            'packetbeat-*',
            'winlogbeat-*',
          ],
          ignore_unavailable: true,
          track_total_hits: false,
          body: {
            docvalue_fields: mockOptions.docValueFields,
            aggregations: {
              host_count: { cardinality: { field: 'host.name' } },
              host_data: {
                terms: { size: 10, field: 'host.name', order: { lastSeen: 'desc' } },
                aggs: {
                  lastSeen: { max: { field: '@timestamp' } },
                  os: {
                    top_hits: {
                      size: 1,
                      sort: [{ '@timestamp': { order: 'desc' } }],
                      _source: { includes: ['host.os.*'] },
                    },
                  },
                },
              },
            },
            query: {
              bool: {
                filter: [
                  { bool: { must: [], filter: [{ match_all: {} }], should: [], must_not: [] } },
                  {
                    range: {
                      '@timestamp': {
                        gte: '2020-09-03T09:15:21.415Z',
                        lte: '2020-09-04T09:15:21.415Z',
                        format: 'strict_date_optional_time',
                      },
                    },
                  },
                ],
              },
            },
            size: 0,
          },
        },
        null,
        2
      ),
    ],
  },
  edges: [
    {
      node: {
        _id: 'bastion00.siem.estc.dev',
        lastSeen: ['2020-09-04T09:15:21.410Z'],
        host: { name: ['bastion00.siem.estc.dev'] },
      },
      cursor: { value: 'bastion00.siem.estc.dev', tiebreaker: null },
    },
    {
      node: {
        _id: 'es02.siem.estc.dev',
        lastSeen: ['2020-09-04T09:15:07.990Z'],
        host: { name: ['es02.siem.estc.dev'] },
      },
      cursor: { value: 'es02.siem.estc.dev', tiebreaker: null },
    },
    {
      node: {
        _id: 'es00.siem.estc.dev',
        lastSeen: ['2020-09-04T09:15:06.783Z'],
        host: { name: ['es00.siem.estc.dev'] },
      },
      cursor: { value: 'es00.siem.estc.dev', tiebreaker: null },
    },
    {
      node: {
        _id: 'es01.siem.estc.dev',
        lastSeen: ['2020-09-04T09:15:00.781Z'],
        host: { name: ['es01.siem.estc.dev'] },
      },
      cursor: { value: 'es01.siem.estc.dev', tiebreaker: null },
    },
    {
      node: {
        _id: 'siem-windows',
        lastSeen: ['2020-09-04T09:14:40.354Z'],
        host: {
          name: ['siem-windows'],
          os: { name: ['Windows Server 2019 Datacenter'], version: ['10.0'] },
        },
      },
      cursor: { value: 'siem-windows', tiebreaker: null },
    },
    {
      node: {
        _id: 'filebeat-cloud',
        lastSeen: ['2020-09-04T08:17:01.000Z'],
        host: { name: ['filebeat-cloud'] },
      },
      cursor: { value: 'filebeat-cloud', tiebreaker: null },
    },
    {
      node: {
        _id: 'kibana00.siem.estc.dev',
        lastSeen: ['2020-09-04T08:17:01.000Z'],
        host: { name: ['kibana00.siem.estc.dev'] },
      },
      cursor: { value: 'kibana00.siem.estc.dev', tiebreaker: null },
    },
    {
      node: {
        _id: 'DESKTOP-QBBSCUT',
        lastSeen: ['2020-09-03T16:28:07.957Z'],
        host: { name: ['DESKTOP-QBBSCUT'], os: { name: ['Windows 10 Pro'], version: ['10.0'] } },
      },
      cursor: { value: 'DESKTOP-QBBSCUT', tiebreaker: null },
    },
    {
      node: {
        _id: 'mainqa-atlcolo-10-0-7-195.eng.endgames.local',
        lastSeen: ['2020-09-03T16:27:37.515Z'],
        host: {
          name: ['mainqa-atlcolo-10-0-7-195.eng.endgames.local'],
          os: { name: ['macOS'], version: ['10.14.1'] },
        },
      },
      cursor: { value: 'mainqa-atlcolo-10-0-7-195.eng.endgames.local', tiebreaker: null },
    },
  ],
  totalCount: 9,
  pageInfo: { activePage: 0, fakeTotalCount: 9, showMorePagesIndicator: false },
};

export const mockBuckets: HostAggEsItem = {
  key: 'zeek-london',
  os: {
    hits: {
      total: {
        value: 242338,
        relation: 'eq',
      },
      max_score: null,
      hits: [
        {
          _index: 'auditbeat-8.0.0-2019.09.06-000022',
          _id: 'dl0T_m0BHe9nqdOiF2A8',
          _score: null,
          _source: {
            host: {
              os: {
                kernel: ['5.0.0-1013-gcp'],
                name: ['Ubuntu'],
                family: ['debian'],
                version: ['18.04.2 LTS (Bionic Beaver)'],
                platform: ['ubuntu'],
              },
            },
          },
          sort: [1571925726017],
        },
      ],
    },
  },
};

export const expectedDsl = {
  allow_no_indices: true,
  track_total_hits: false,
  body: {
    aggregations: {
      host_count: { cardinality: { field: 'host.name' } },
      host_data: {
        aggs: {
          lastSeen: { max: { field: '@timestamp' } },
          os: {
            top_hits: {
              _source: { includes: ['host.os.*'] },
              size: 1,
              sort: [{ '@timestamp': { order: 'desc' } }],
            },
          },
        },
        terms: { field: 'host.name', order: { lastSeen: 'desc' }, size: 10 },
      },
    },
    query: {
      bool: {
        filter: [
          { bool: { filter: [{ match_all: {} }], must: [], must_not: [], should: [] } },
          {
            range: {
              '@timestamp': {
                format: 'strict_date_optional_time',
                gte: '2020-09-03T09:15:21.415Z',
                lte: '2020-09-04T09:15:21.415Z',
              },
            },
          },
        ],
      },
    },
    docvalue_fields: mockOptions.docValueFields,
    size: 0,
  },
  ignore_unavailable: true,
  index: [
    'apm-*-transaction*',
    'traces-apm*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
};

export const mockDeps = {
  esClient: elasticsearchServiceMock.createScopedClusterClient(),
  savedObjectsClient: {} as SavedObjectsClientContract,
  endpointContext: {
    logFactory: {
      get: jest.fn(),
    },
    config: jest.fn().mockResolvedValue({}),
    experimentalFeatures: {
      ...allowedExperimentalValues,
    },
    service: {} as EndpointAppContextService,
  } as EndpointAppContext,
  request: {} as KibanaRequest,
};
