/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ConfigProps,
  SeriesConfig,
  ReportTypes,
  FILTER_RECORDS,
  REPORT_METRIC_FIELD,
} from '../../../../observability/public';

export function getSecurityKPIConfig(_config: ConfigProps): SeriesConfig {
  return {
    reportType: ReportTypes.KPI,
    defaultSeriesType: 'area',
    seriesTypes: [],
    xAxisColumn: {
      sourceField: '@timestamp',
    },
    yAxisColumns: [
      {
        sourceField: REPORT_METRIC_FIELD,
        operationType: 'unique_count',
      },
    ],
    hasOperationType: false,
    filterFields: [],
    breakdownFields: [
      'agent.type',
      'event.action',
      'event.module',
      'event.dataset',
      'event.category',
    ],
    baseFilters: [],
    definitionFields: [{ field: 'host.name' }],
    metricOptions: [
      {
        label: 'Hosts',
        field: 'host.name',
        id: 'host.name',
      },
      {
        label: 'TOP_DNS_DOMAINS',
        id: 'TOP_DNS_DOMAINS',
        field: 'dns.question.registered_domain',
        columnType: FILTER_RECORDS,
        columnFilters: [],
      },
      {
        label: 'External alerts',
        id: 'EXTERNAL_ALERTS',
        columnType: FILTER_RECORDS,
        columnFilters: [
          {
            language: 'kuery',
            query: `event.kind: alert and host.name: * `,
          },
        ],
      },
      {
        label: 'Events',
        id: 'EVENT_RECORDS',
        field: 'EVENT_RECORDS',
        columnType: FILTER_RECORDS,
        columnFilters: [
          {
            language: 'kuery',
            query: `event: * `,
          },
        ],
      },
      {
        label: 'source ip',
        id: 'source.ip',
        field: 'source.ip',
      },
      {
        label: 'destination ip',
        id: 'destination.ip',
        field: 'destination.ip',
      },
      {
        label: 'source private ip',
        id: 'source.private.ip',
        field: 'source.ip',
        columnType: FILTER_RECORDS,
        columnFilters: [
          {
            language: 'kuery',
            query:
              'source.ip: "10.0.0.0/8" or source.ip: "192.168.0.0/16" or source.ip: "172.16.0.0/12" or source.ip: "fd00::/8"',
          },
        ],
      },
      {
        label: 'destination private ip',
        id: 'destination.private.ip',
        field: 'destination.ip',
        columnType: FILTER_RECORDS,
        columnFilters: [
          {
            language: 'kuery',
            query:
              'destination.ip: "10.0.0.0/8" or destination.ip: "192.168.0.0/16" or destination.ip: "172.16.0.0/12" or destination.ip: "fd00::/8"',
          },
        ],
      },
    ],
    labels: { 'host.name': 'Hosts', 'url.full': 'URL', 'agent.type': 'Agent type' },
  };
}

export function getSecurityAuthenticationsConfig(_config: ConfigProps): SeriesConfig {
  return {
    reportType: 'event_outcome',
    defaultSeriesType: 'bar',
    seriesTypes: [],
    xAxisColumn: {
      sourceField: '@timestamp',
    },
    yAxisColumns: [
      {
        sourceField: REPORT_METRIC_FIELD,
        operationType: 'unique_count',
      },
    ],
    hasOperationType: false,
    filterFields: [],
    breakdownFields: [],
    baseFilters: [],
    palette: { type: 'palette', name: 'status' },
    definitionFields: [{ field: 'host.name' }],
    metricOptions: [
      {
        label: 'success',
        id: 'EVENT_SUCCESS',
        columnType: FILTER_RECORDS,
        columnFilters: [
          {
            language: 'kuery',
            query: `event.outcome: "success" and event.category: "authentication"`,
          },
        ],
      },
      {
        label: 'failure',
        id: 'EVENT_FAILURE',
        columnType: FILTER_RECORDS,
        columnFilters: [
          {
            language: 'kuery',
            query: `event.outcome: "failure" and event.category: "authentication"`,
          },
        ],
      },
    ],
    labels: { 'host.name': 'Hosts', 'url.full': 'URL', 'agent.type': 'Agent type' },
  };
}

export const USE_BREAK_DOWN_COLUMN = 'USE_BREAK_DOWN_COLUMN';

export function getSecurityUniqueIpsKPIConfig(_config: ConfigProps): SeriesConfig {
  return {
    defaultSeriesType: 'bar_horizontal_stacked',
    reportType: 'unique_ip',
    seriesTypes: ['bar_horizontal_stacked'],
    xAxisColumn: {
      sourceField: REPORT_METRIC_FIELD,
    },
    yAxisColumns: [
      {
        sourceField: REPORT_METRIC_FIELD,
        operationType: 'unique_count',
      },
    ],
    hasOperationType: false,
    filterFields: [],
    breakdownFields: [],
    baseFilters: [],
    labels: { 'host.name': 'Hosts', 'url.full': 'URL', 'agent.type': 'Agent type' },
    definitionFields: ['host.name'],
    metricOptions: [
      {
        id: 'source_ip',
        field: 'source.ip',
        label: 'Unique source IPs',
        paramFilters: [{ label: 'Src', input: { query: 'source.ip : *', language: 'kuery' } }],
      },
      {
        id: 'destination_ip',
        field: 'destination.ip',
        label: 'Unique destination IPs',
        paramFilters: [
          { label: 'Dest', input: { query: 'destination.ip : *', language: 'kuery' } },
        ],
      },
    ],
  };
}

export function getSecurityUniquePrivateIpsKPIConfig(_config: ConfigProps): SeriesConfig {
  return {
    defaultSeriesType: 'bar_horizontal_stacked',
    reportType: 'unique_private_ip',
    seriesTypes: ['bar_horizontal_stacked'],
    xAxisColumn: {
      sourceField: REPORT_METRIC_FIELD,
    },
    yAxisColumns: [
      {
        sourceField: REPORT_METRIC_FIELD,
        operationType: 'unique_count',
      },
    ],
    hasOperationType: false,
    filterFields: [],
    breakdownFields: [],
    baseFilters: [],
    labels: { 'host.name': 'Hosts', 'url.full': 'URL', 'agent.type': 'Agent type' },
    definitionFields: ['host.name'],
    metricOptions: [
      {
        id: 'source_private_ip',
        field: 'source.ip',
        label: 'Unique source private IPs',
        paramFilters: [
          {
            label: 'Src',
            input: {
              query:
                'source.ip: "10.0.0.0/8" or source.ip: "192.168.0.0/16" or source.ip: "172.16.0.0/12" or source.ip: "fd00::/8"',
              language: 'kuery',
            },
          },
        ],
      },
      {
        id: 'destination_private_ip',
        field: 'destination.ip',
        label: 'Unique destination private IPs',
        paramFilters: [
          {
            label: 'Dest',
            input: {
              query:
                'destination.ip: "10.0.0.0/8" or destination.ip: "192.168.0.0/16" or destination.ip: "172.16.0.0/12" or destination.ip: "fd00::/8"',
              language: 'kuery',
            },
          },
        ],
      },
    ],
  };
}

export function getSingleMetricConfig(_config: ConfigProps): SeriesConfig {
  return {
    xAxisColumn: {},
    yAxisColumns: [],
    breakdownFields: [],
    defaultSeriesType: '',
    filterFields: [],
    seriesTypes: [],
    definitionFields: [],
    reportType: 'singleMetric',
    metricOptions: [
      {
        id: 'unique_host',
        field: 'host.name',
        label: 'Hosts',
      },
      {
        id: 'auth_success',
        field: 'Records_auth_success',
        label: 'Success',
        columnFilter: {
          language: 'kuery',
          query: `event.outcome: "success" and event.category: "authentication"`,
        },
      },
      {
        id: 'auth_failure',
        field: 'Records_auth_failure',
        label: 'Failure',
        columnFilter: {
          language: 'kuery',
          query: `event.outcome: "failure" and event.category: "authentication"`,
        },
      },
      {
        id: 'source.ip',
        field: 'source.ip',
        label: 'Source',
        columnFilter: {
          language: 'kuery',
          query: `source.ip: *`,
        },
      },
      {
        id: 'destination.ip',
        field: 'destination.ip',
        label: 'Destination',
        columnFilter: {
          language: 'kuery',
          query: `destination.ip: *`,
        },
      },
      {
        id: 'network_events',
        field: 'Records_network_events',
        label: 'Network events',
        columnFilter: {
          language: 'kuery',
          query: `destination.ip: * or source.ip: *`,
        },
      },
      {
        id: 'records_dns_queries',
        field: 'Records_dns_queries',
        label: 'DNS queries',
        columnFilter: {
          language: 'kuery',
          query: `dns.question.name: * or suricata.eve.dns.type: "query" or zeek.dns.query: *`,
        },
      },
      {
        id: 'unique_flow_ids',
        field: 'network.community_id',
        label: 'Unique flow IDs',
        columnFilter: {
          language: 'kuery',
          query: `source.ip: * or destination.ip: *`,
        },
      },
      {
        id: 'TLS handshakes',
        field: 'Records_tls_handshakes',
        label: 'TLS handshakes',
        columnFilter: {
          language: 'kuery',
          query: `(source.ip: * or destination.ip: *) and (tls.version: * or suricata.eve.tls.version: * or zeek.ssl.version: *)`,
        },
      },
      {
        id: 'source_private_ips',
        field: 'records_source_private_ips',
        label: 'Source',
        columnFilter: {
          language: 'kuery',
          query:
            'source.ip: "10.0.0.0/8" or source.ip: "192.168.0.0/16" or source.ip: "172.16.0.0/12" or source.ip: "fd00::/8"',
        },
      },
      {
        id: 'destination_private_ips',
        field: 'records_destination_private_ips',
        label: 'Destination',
        columnFilter: {
          language: 'kuery',
          query:
            'destination.ip: "10.0.0.0/8" or destination.ip: "192.168.0.0/16" or destination.ip: "172.16.0.0/12" or destination.ip: "fd00::/8"',
        },
      },
    ],
    labels: {},
  };
}
