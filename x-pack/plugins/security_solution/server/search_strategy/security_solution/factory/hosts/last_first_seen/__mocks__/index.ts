/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Direction,
  HostFirstLastSeenRequestOptions,
  HostsQueries,
} from '../../../../../../../common/search_strategy';

export const mockOptions: HostFirstLastSeenRequestOptions = {
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
  docValueFields: [],
  factoryQueryType: HostsQueries.firstOrLastSeen,
  hostName: 'siem-kibana',
  order: Direction.asc,
};

export const mockSearchStrategyFirstSeenResponse = {
  isPartial: false,
  isRunning: false,
  rawResponse: {
    took: 230,
    timed_out: false,
    _shards: { total: 21, successful: 21, skipped: 0, failed: 0 },
    hits: {
      total: -1,
      max_score: 0,
      hits: [
        {
          _type: 'doc',
          _score: 0,
          _index: 'auditbeat-7.8.0-2021.02.17-000012',
          _id: 'nRIAs3cBX5UUcOOYANIW',
          _source: {
            '@timestamp': '2021-02-18T02:37:37.682Z',
          },
          fields: {
            '@timestamp': ['2021-02-18T02:37:37.682Z'],
          },
          sort: ['1613615857682'],
        },
      ],
    },
    firstSeen: '2020-09-08T08:48:51.759Z',
  },
  total: 21,
  loaded: 21,
};

export const mockSearchStrategyLastSeenResponse = {
  isPartial: false,
  isRunning: false,
  rawResponse: {
    took: 230,
    timed_out: false,
    _shards: { total: 21, successful: 21, skipped: 0, failed: 0 },
    hits: {
      total: -1,
      max_score: 0,
      hits: [
        {
          _type: 'doc',
          _score: 0,
          _index: 'auditbeat-7.8.0-2021.02.17-000012',
          _id: 'nRIAs3cBX5UUcOOYANIW',
          _source: {
            '@timestamp': '2021-02-18T02:37:37.682Z',
          },
          fields: {
            '@timestamp': ['2021-02-18T02:37:37.682Z'],
          },
          sort: ['1613615857682'],
        },
      ],
    },
    lastSeen: '2020-09-08T08:48:51.759Z',
  },
  total: 21,
  loaded: 21,
};

export const formattedSearchStrategyFirstResponse = {
  isPartial: false,
  isRunning: false,
  rawResponse: {
    took: 230,
    timed_out: false,
    _shards: { total: 21, successful: 21, skipped: 0, failed: 0 },
    hits: {
      total: -1,
      max_score: 0,
      hits: [
        {
          _index: 'auditbeat-7.8.0-2021.02.17-000012',
          _id: 'nRIAs3cBX5UUcOOYANIW',
          _score: 0,
          _source: {
            '@timestamp': '2021-02-18T02:37:37.682Z',
          },
          fields: {
            '@timestamp': ['2021-02-18T02:37:37.682Z'],
          },
          sort: ['1613615857682'],
        },
      ],
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
            query: { bool: { filter: [{ term: { 'host.name': 'siem-kibana' } }] } },
            _source: ['@timestamp'],
            size: 1,
            sort: [
              {
                '@timestamp': {
                  order: Direction.asc,
                },
              },
            ],
          },
        },
        null,
        2
      ),
    ],
  },
  firstSeen: '2021-02-18T02:37:37.682Z',
};

export const formattedSearchStrategyLastResponse = {
  isPartial: false,
  isRunning: false,
  rawResponse: {
    took: 230,
    timed_out: false,
    _shards: { total: 21, successful: 21, skipped: 0, failed: 0 },
    hits: {
      total: -1,
      max_score: 0,
      hits: [
        {
          _index: 'auditbeat-7.8.0-2021.02.17-000012',
          _id: 'nRIAs3cBX5UUcOOYANIW',
          _score: 0,
          _source: {
            '@timestamp': '2021-02-18T02:37:37.682Z',
          },
          fields: {
            '@timestamp': ['2021-02-18T02:37:37.682Z'],
          },
          sort: ['1613615857682'],
        },
      ],
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
            query: { bool: { filter: [{ term: { 'host.name': 'siem-kibana' } }] } },
            _source: ['@timestamp'],
            size: 1,
            sort: [
              {
                '@timestamp': {
                  order: Direction.desc,
                },
              },
            ],
          },
        },
        null,
        2
      ),
    ],
  },
  lastSeen: '2021-02-18T02:37:37.682Z',
};

export const expectedDsl = {
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
    _source: ['@timestamp'],
    query: { bool: { filter: [{ term: { 'host.name': 'siem-kibana' } }] } },
    size: 1,
    sort: [{ '@timestamp': { order: Direction.asc } }],
  },
};
