/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleRegistryMocks } from '../../../../../../../rule_registry/server/mocks';
import { EnrichedEvent } from './enrich_events';

export const mockPercolatorRuleDataClient = ruleRegistryMocks.createRuleDataClient(
  '.percolator.alerts-security.alerts'
);

export const mockRuleId = 'abcd-defg-hijk-lmno';

export const mockRuleVersion = 1337;

export const mockSpaceId = 'eces-space';

export const sampleIndicatorHit = {
  _id: '13371337__SEP__test-index__SEP__file.hash.md5__SEP__threat.indicator.file.hash.md5',
  _index: 'threat-index',
  _source: {
    query: {
      mock: true,
    },
    threat: {
      indicator: {
        file: {
          hash: {
            md5: 'ece123ece345ece678',
          },
        },
      },
    },
  },
};

export const sampleIndicatorHit2 = {
  _id: '99999999__SEP__test-index2__SEP__destination.name__SEP__host.name',
  _index: 'threat-index',
  _source: {
    query: {
      mock2: true,
    },
    host: {
      name: "Ece's MacBook",
    },
  },
};

export const sampleEventHit = {
  _id: '1111',
  _index: 'event-index',
  _source: {
    event: {
      category: 'fake',
    },
    file: {
      hash: {
        sha1: 'asdf',
      },
    },
  },
};

export const sampleEventHitWithThreat = {
  _id: '1111',
  _index: 'event-index',
  _source: {
    threat: {
      indicator: {
        mockField: true,
      },
    },
    event: {
      category: 'fake',
    },
    file: {
      hash: {
        sha1: 'asdf',
      },
    },
  },
};

export const sampleEnrichment = {
  matched: {
    atomic: '61.54.61.255',
    field: 'destination.ip',
    id: '123',
    index: 'threat_index',
    type: 'indicator_match_rule',
  },
  indicator: {
    reference: 'https://urlhaus.abuse.ch/url/1996847/',
    first_seen: '2022-01-22T00:45:06.000Z',
    provider: 'geenensp',
    ip: '61.54.61.255',
    type: 'url',
    url: {
      path: '/bin.sh',
      extension: 'sh',
      original: 'http://61.54.61.255:42050/bin.sh',
      scheme: 'http',
      port: 42050,
      domain: '61.54.61.255',
      full: 'http://61.54.61.255:42050/bin.sh',
    },
  },
  feed: { name: "Ece's Threat Feed", dashboard_id: '3456-3456-3456' },
};

export const sampleEnrichment2 = {
  matched: {
    atomic: '11.54.61.255',
    field: 'source.ip',
    id: '12344',
    index: 'threat_index',
    type: 'indicator_match_rule',
  },
  indicator: {
    reference: 'fakeurl',
    first_seen: '2022-01-22T00:45:06.000Z',
    provider: 'geenensp',
    ip: '61.54.61.255',
  },
  feed: { name: "Ece's Threat Feed", dashboard_id: '3456-3456-3456' },
};

export const sampleEventHitWithEnrichment: EnrichedEvent = {
  _id: '1111',
  _index: 'event-index',
  _source: {
    threat: {
      indicator: {
        mockField: true,
      },
      enrichments: [sampleEnrichment],
    },
    event: {
      category: 'fake',
    },
    file: {
      hash: {
        sha1: 'asdf',
      },
    },
  },
};

export const duplicateEventHitWithEnrichment: EnrichedEvent = {
  _id: '1111',
  _index: 'event-index',
  _source: {
    threat: {
      indicator: {
        mockField: true,
      },
      enrichments: [sampleEnrichment2],
    },
    event: {
      category: 'fake',
    },
    file: {
      hash: {
        sha1: 'asdf',
      },
    },
  },
};

export const uniqueEventHitWithEnrichment: EnrichedEvent = {
  _id: '999',
  _index: 'event-index',
  _source: {
    threat: {
      indicator: {
        mockField: true,
      },
      enrichments: [sampleEnrichment],
    },
    event: {
      category: 'fake',
    },
    file: {
      hash: {
        sha1: 'asdf',
      },
    },
  },
};

export const sampleChunkedSourceEventHits = [
  [
    { _id: '1', _index: 'events-1', _source: { existingMockField: 1 } },
    { _id: '2', _index: 'events-1', _source: { existingMockField: 2 } },
    { _id: '3', _index: 'events-1', _source: { existingMockField: 3 } },
  ],
  [
    { _id: '1001', _index: 'events-2', _source: { existingMockField: 4 } },
    { _id: '1002', _index: 'events-2', _source: { existingMockField: 5 } },
    { _id: '1003', _index: 'events-2', _source: { existingMockField: 6 } },
  ],
];

export const mockThreatQueries = [
  {
    bool: {
      must: [{ match: { rule_id: 'abcd-defg-hijk-lmno' } }, { match: { rule_version: 1337 } }],
      should: [{ match: { 'source.ip': { query: '127.0.0.1' } } }],
      minimum_should_match: 1,
    },
    _name: '123__SEP__threat_index__SEP__source.ip__SEP__source.ip',
    indicator: {
      _id: '123',
      _index: 'threat_index',
      _score: 0,
      _source: {
        '@timestamp': '2020-09-09T21:59:13Z',
        host: { name: 'host-1', ip: '192.168.0.0.1' },
        source: { ip: '127.0.0.1', port: 1 },
        destination: { ip: '127.0.0.1', port: 1 },
      },
      fields: {
        '@timestamp': ['2020-09-09T21:59:13Z'],
        'host.name': ['host-1'],
        'host.ip': ['192.168.0.0.1'],
        'source.ip': ['127.0.0.1'],
        'source.port': [1],
        'destination.ip': ['127.0.0.1'],
        'destination.port': [1],
      },
    },
  },
  {
    bool: {
      must: [{ match: { rule_id: 'abcd-defg-hijk-lmno' } }, { match: { rule_version: 1337 } }],
      should: [{ match: { 'destination.ip': { query: '127.0.0.1' } } }],
      minimum_should_match: 1,
    },
    _name: '123__SEP__threat_index__SEP__destination.ip__SEP__source.ip',
    indicator: {
      _id: '123',
      _index: 'threat_index',
      _score: 0,
      _source: {
        '@timestamp': '2020-09-09T21:59:13Z',
        host: { name: 'host-1', ip: '192.168.0.0.1' },
        source: { ip: '127.0.0.1', port: 1 },
        destination: { ip: '127.0.0.1', port: 1 },
      },
      fields: {
        '@timestamp': ['2020-09-09T21:59:13Z'],
        'host.name': ['host-1'],
        'host.ip': ['192.168.0.0.1'],
        'source.ip': ['127.0.0.1'],
        'source.port': [1],
        'destination.ip': ['127.0.0.1'],
        'destination.port': [1],
      },
    },
  },
];

export const emptySearchResult = {
  searchResult: {
    took: 0,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      failed: 0,
      skipped: 0,
    },
    hits: {
      total: 0,
      max_score: 0,
      hits: [],
    },
  },
  searchDuration: '0',
  searchErrors: [],
};

export const searchResultOneEvent = {
  searchResult: {
    took: 0,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      failed: 0,
      skipped: 0,
    },
    hits: {
      total: 0,
      max_score: 0,
      hits: [{ ...sampleEventHit, sort: ['333'] }],
    },
  },
  searchDuration: '0',
  searchErrors: [],
};

export const samplePercolatorHit = {
  _index: 'filebeat-8',
  _id: '123__SEP__threat_index__SEP__destination.ip__SEP__threat.indicator.ip',
  _source: {
    query: {
      bool: {
        must: [
          {
            match: {
              fakeField: true,
            },
          },
        ],
      },
    },
    rule_id: '1234-2345-3456',
    rule_version: 6,
    agent: {
      name: "Ece's agent",
    },
    event: {
      category: 'threat intel',
      type: 'indicator',
    },
    threat: {
      indicator: {
        reference: 'https://urlhaus.abuse.ch/url/1996847/',
        first_seen: '2022-01-22T00:45:06.000Z',
        provider: 'geenensp',
        ip: '61.54.61.255',
        type: 'url',
        url: {
          path: '/bin.sh',
          extension: 'sh',
          original: 'http://61.54.61.255:42050/bin.sh',
          scheme: 'http',
          port: 42050,
          domain: '61.54.61.255',
          full: 'http://61.54.61.255:42050/bin.sh',
        },
      },
      feed: {
        name: "Ece's Threat Feed",
        dashboard_id: '3456-3456-3456',
      },
    },
  },
  fields: {
    _percolator_document_slot: [0],
  },
};

export const sampleLegacyPercolatorHit = {
  _index: 'filebeat-8',
  _id: '123__SEP__threat_index__SEP__destination.ip__SEP__threatintel.indicator.ip',
  _source: {
    query: {
      bool: {
        must: [
          {
            match: {
              fakeField: true,
            },
          },
        ],
      },
    },
    rule_id: '1234-2345-3456',
    rule_version: 6,
    agent: {
      name: "Ece's agent",
    },
    event: {
      category: 'threat intel',
      type: 'indicator',
    },
    threatintel: {
      indicator: {
        reference: 'https://urlhaus.abuse.ch/url/1996847/',
        first_seen: '2022-01-22T00:45:06.000Z',
        provider: 'geenensp',
        ip: '61.54.61.255',
        type: 'url',
        url: {
          path: '/bin.sh',
          extension: 'sh',
          original: 'http://61.54.61.255:42050/bin.sh',
          scheme: 'http',
          port: 42050,
          domain: '61.54.61.255',
          full: 'http://61.54.61.255:42050/bin.sh',
        },
      },
      feed: {
        name: "Ece's Threat Feed",
        dashboard_id: '3456-3456-3456',
      },
    },
  },
  fields: {
    _percolator_document_slot: [0],
  },
};
