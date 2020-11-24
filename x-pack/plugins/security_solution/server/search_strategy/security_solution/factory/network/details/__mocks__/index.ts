/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEsSearchResponse } from '../../../../../../../../../../src/plugins/data/common';

import {
  NetworkDetailsRequestOptions,
  NetworkQueries,
} from '../../../../../../../common/search_strategy';

export const mockOptions: NetworkDetailsRequestOptions = {
  defaultIndex: [
    'apm-*-transaction*',
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
  factoryQueryType: NetworkQueries.details,
  filterQuery: '{"bool":{"must":[],"filter":[{"match_all":{}}],"should":[],"must_not":[]}}',
  ip: '35.196.65.164',
};

export const mockSearchStrategyResponse: IEsSearchResponse<unknown> = {
  isPartial: false,
  isRunning: false,
  rawResponse: {
    took: 2620,
    timed_out: false,
    _shards: { total: 21, successful: 21, skipped: 0, failed: 0 },
    hits: { total: 0, max_score: 0, hits: [] },
    aggregations: {
      host: {
        doc_count: 0,
        results: { hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] } },
      },
      destination: {
        meta: {},
        doc_count: 5,
        geo: {
          meta: {},
          doc_count: 5,
          results: {
            hits: {
              total: { value: 5, relation: 'eq' },
              max_score: null,
              hits: [
                {
                  _index: 'filebeat-8.0.0-2020.09.02-000001',
                  _id: 'dd4fa2d4bd-1523631609876537',
                  _score: null,
                  _source: {
                    destination: {
                      geo: {
                        continent_name: 'North America',
                        region_iso_code: 'US-VA',
                        country_iso_code: 'US',
                        region_name: 'Virginia',
                        location: { lon: -77.2481, lat: 38.6583 },
                      },
                    },
                  },
                  sort: [1599703212208],
                },
              ],
            },
          },
        },
        as: {
          meta: {},
          doc_count: 5,
          results: {
            hits: {
              total: { value: 5, relation: 'eq' },
              max_score: null,
              hits: [
                {
                  _index: 'filebeat-8.0.0-2020.09.02-000001',
                  _id: 'dd4fa2d4bd-1523631609876537',
                  _score: null,
                  _source: {
                    destination: { as: { number: 15169, organization: { name: 'Google LLC' } } },
                  },
                  sort: [1599703212208],
                },
              ],
            },
          },
        },
        lastSeen: { value: 1599703212208, value_as_string: '2020-09-10T02:00:12.208Z' },
        firstSeen: { value: 1598802015355, value_as_string: '2020-08-30T15:40:15.355Z' },
      },
      source: {
        meta: {},
        doc_count: 5,
        geo: {
          meta: {},
          doc_count: 5,
          results: {
            hits: {
              total: { value: 5, relation: 'eq' },
              max_score: null,
              hits: [
                {
                  _index: 'filebeat-8.0.0-2020.09.02-000001',
                  _id: 'dd4fa2d4bd-1523631486500511',
                  _score: null,
                  _source: {
                    source: {
                      geo: {
                        continent_name: 'North America',
                        region_iso_code: 'US-VA',
                        country_iso_code: 'US',
                        region_name: 'Virginia',
                        location: { lon: -77.2481, lat: 38.6583 },
                      },
                    },
                  },
                  sort: [1599703214494],
                },
              ],
            },
          },
        },
        as: {
          meta: {},
          doc_count: 5,
          results: {
            hits: {
              total: { value: 5, relation: 'eq' },
              max_score: null,
              hits: [
                {
                  _index: 'filebeat-8.0.0-2020.09.02-000001',
                  _id: 'dd4fa2d4bd-1523631486500511',
                  _score: null,
                  _source: {
                    source: { as: { number: 15169, organization: { name: 'Google LLC' } } },
                  },
                  sort: [1599703214494],
                },
              ],
            },
          },
        },
        lastSeen: { value: 1599703214494, value_as_string: '2020-09-10T02:00:14.494Z' },
        firstSeen: { value: 1598802015107, value_as_string: '2020-08-30T15:40:15.107Z' },
      },
    },
  },
  total: 21,
  loaded: 21,
};

export const formattedSearchStrategyResponse = {
  ...mockSearchStrategyResponse,
  inspect: {
    dsl: [
      JSON.stringify(
        {
          allowNoIndices: true,
          index: [
            'apm-*-transaction*',
            'auditbeat-*',
            'endgame-*',
            'filebeat-*',
            'logs-*',
            'packetbeat-*',
            'winlogbeat-*',
          ],
          ignoreUnavailable: true,
          body: {
            docvalue_fields: mockOptions.docValueFields,
            aggs: {
              source: {
                filter: { term: { 'source.ip': '35.196.65.164' } },
                aggs: {
                  firstSeen: { min: { field: '@timestamp' } },
                  lastSeen: { max: { field: '@timestamp' } },
                  as: {
                    filter: { exists: { field: 'source.as' } },
                    aggs: {
                      results: {
                        top_hits: {
                          size: 1,
                          _source: ['source.as'],
                          sort: [{ '@timestamp': 'desc' }],
                        },
                      },
                    },
                  },
                  geo: {
                    filter: { exists: { field: 'source.geo' } },
                    aggs: {
                      results: {
                        top_hits: {
                          size: 1,
                          _source: ['source.geo'],
                          sort: [{ '@timestamp': 'desc' }],
                        },
                      },
                    },
                  },
                },
              },
              destination: {
                filter: { term: { 'destination.ip': '35.196.65.164' } },
                aggs: {
                  firstSeen: { min: { field: '@timestamp' } },
                  lastSeen: { max: { field: '@timestamp' } },
                  as: {
                    filter: { exists: { field: 'destination.as' } },
                    aggs: {
                      results: {
                        top_hits: {
                          size: 1,
                          _source: ['destination.as'],
                          sort: [{ '@timestamp': 'desc' }],
                        },
                      },
                    },
                  },
                  geo: {
                    filter: { exists: { field: 'destination.geo' } },
                    aggs: {
                      results: {
                        top_hits: {
                          size: 1,
                          _source: ['destination.geo'],
                          sort: [{ '@timestamp': 'desc' }],
                        },
                      },
                    },
                  },
                },
              },
              host: {
                filter: { term: { 'host.ip': '35.196.65.164' } },
                aggs: {
                  results: {
                    top_hits: { size: 1, _source: ['host'], sort: [{ '@timestamp': 'desc' }] },
                  },
                },
              },
            },
            query: { bool: { should: [] } },
            size: 0,
            track_total_hits: false,
          },
        },
        null,
        2
      ),
    ],
  },
  networkDetails: {
    source: {
      firstSeen: '2020-08-30T15:40:15.107Z',
      lastSeen: '2020-09-10T02:00:14.494Z',
      autonomousSystem: { number: 15169, organization: { name: 'Google LLC' } },
      geo: {
        continent_name: 'North America',
        region_iso_code: 'US-VA',
        country_iso_code: 'US',
        region_name: 'Virginia',
        location: { lon: -77.2481, lat: 38.6583 },
      },
    },
    destination: {
      firstSeen: '2020-08-30T15:40:15.355Z',
      lastSeen: '2020-09-10T02:00:12.208Z',
      autonomousSystem: { number: 15169, organization: { name: 'Google LLC' } },
      geo: {
        continent_name: 'North America',
        region_iso_code: 'US-VA',
        country_iso_code: 'US',
        region_name: 'Virginia',
        location: { lon: -77.2481, lat: 38.6583 },
      },
    },
    host: {},
  },
};

export const expectedDsl = {
  allowNoIndices: true,
  index: [
    'apm-*-transaction*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  ignoreUnavailable: true,
  body: {
    aggs: {
      source: {
        filter: { term: { 'source.ip': '35.196.65.164' } },
        aggs: {
          firstSeen: { min: { field: '@timestamp' } },
          lastSeen: { max: { field: '@timestamp' } },
          as: {
            filter: { exists: { field: 'source.as' } },
            aggs: {
              results: {
                top_hits: { size: 1, _source: ['source.as'], sort: [{ '@timestamp': 'desc' }] },
              },
            },
          },
          geo: {
            filter: { exists: { field: 'source.geo' } },
            aggs: {
              results: {
                top_hits: { size: 1, _source: ['source.geo'], sort: [{ '@timestamp': 'desc' }] },
              },
            },
          },
        },
      },
      destination: {
        filter: { term: { 'destination.ip': '35.196.65.164' } },
        aggs: {
          firstSeen: { min: { field: '@timestamp' } },
          lastSeen: { max: { field: '@timestamp' } },
          as: {
            filter: { exists: { field: 'destination.as' } },
            aggs: {
              results: {
                top_hits: {
                  size: 1,
                  _source: ['destination.as'],
                  sort: [{ '@timestamp': 'desc' }],
                },
              },
            },
          },
          geo: {
            filter: { exists: { field: 'destination.geo' } },
            aggs: {
              results: {
                top_hits: {
                  size: 1,
                  _source: ['destination.geo'],
                  sort: [{ '@timestamp': 'desc' }],
                },
              },
            },
          },
        },
      },
      host: {
        filter: { term: { 'host.ip': '35.196.65.164' } },
        aggs: {
          results: { top_hits: { size: 1, _source: ['host'], sort: [{ '@timestamp': 'desc' }] } },
        },
      },
    },
    docvalue_fields: mockOptions.docValueFields,
    query: { bool: { should: [] } },
    size: 0,
    track_total_hits: false,
  },
};
