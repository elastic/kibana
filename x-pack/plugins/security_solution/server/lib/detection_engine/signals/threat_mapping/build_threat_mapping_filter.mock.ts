/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ThreatMapping } from '../../../../../common/detection_engine/schemas/types/threat_mapping';
import { Filter } from 'src/plugins/data/common';

import { SearchResponse } from 'elasticsearch';
import { ThreatListItem } from './types';

export const getThreatMappingMock = (): ThreatMapping => {
  return [
    {
      entries: [
        {
          field: 'host.name',
          type: 'mapping',
          value: 'host.name',
        },
        {
          field: 'host.ip',
          type: 'mapping',
          value: 'host.ip',
        },
      ],
    },
    {
      entries: [
        {
          field: 'destination.ip',
          type: 'mapping',
          value: 'destination.ip',
        },
        {
          field: 'destination.port',
          type: 'mapping',
          value: 'destination.port',
        },
      ],
    },
    {
      entries: [
        {
          field: 'source.port',
          type: 'mapping',
          value: 'source.port',
        },
      ],
    },
    {
      entries: [
        {
          field: 'source.ip',
          type: 'mapping',
          value: 'source.ip',
        },
      ],
    },
  ];
};

export const getThreatListSearchResponseMock = (): SearchResponse<ThreatListItem> => ({
  took: 0,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    failed: 0,
    skipped: 0,
  },
  hits: {
    total: 1,
    max_score: 0,
    hits: [
      {
        _index: 'index',
        _type: 'type',
        _id: '123',
        _score: 0,
        _source: getThreatListItemMock(),
      },
    ],
  },
});

export const getThreatListItemMock = (): ThreatListItem => ({
  '@timestamp': '2020-09-09T21:59:13Z',
  host: {
    name: 'host-1',
    ip: '192.168.0.0.1',
  },
  source: {
    ip: '127.0.0.1',
    port: 1,
  },
  destination: {
    ip: '127.0.0.1',
    port: 1,
  },
});

export const getFilterThreatMapping = (): ThreatMapping => [
  {
    entries: [
      {
        field: 'host.name',
        type: 'mapping',
        value: 'host.name',
      },
      {
        field: 'host.ip',
        type: 'mapping',
        value: 'host.ip',
      },
    ],
  },
  {
    entries: [
      {
        field: 'destination.ip',
        type: 'mapping',
        value: 'destination.ip',
      },
      {
        field: 'destination.port',
        type: 'mapping',
        value: 'destination.port',
      },
    ],
  },
  {
    entries: [
      {
        field: 'source.port',
        type: 'mapping',
        value: 'source.port',
      },
    ],
  },
  {
    entries: [
      {
        field: 'source.ip',
        type: 'mapping',
        value: 'source.ip',
      },
    ],
  },
];

export const getThreatMappingFilterMock = (): Filter => ({
  meta: {
    alias: null,
    negate: false,
    disabled: false,
  },
  query: {
    bool: {
      should: getThreatMappingFiltersShouldMock(),
      minimum_should_match: 1,
    },
  },
});

export const getThreatMappingFiltersShouldMock = (count = 1) => {
  return new Array(count).fill(null).map((_, index) => getThreatMappingFilterShouldMock(index + 1));
};

export const getThreatMappingFilterShouldMock = (port = 1) => ({
  bool: {
    should: [
      {
        bool: {
          filter: [
            {
              bool: {
                should: [{ match: { 'host.name': 'host-1' } }],
                minimum_should_match: 1,
              },
            },
            {
              bool: {
                should: [{ match: { 'host.ip': '192.168.0.0.1' } }],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
      {
        bool: {
          filter: [
            {
              bool: {
                should: [{ match: { 'destination.ip': '127.0.0.1' } }],
                minimum_should_match: 1,
              },
            },
            {
              bool: {
                should: [{ match: { 'destination.port': port } }],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
      {
        bool: {
          filter: [
            {
              bool: {
                should: [{ match: { 'source.port': port } }],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
      {
        bool: {
          filter: [
            {
              bool: {
                should: [{ match: { 'source.ip': '127.0.0.1' } }],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
    ],
    minimum_should_match: 1,
  },
});
