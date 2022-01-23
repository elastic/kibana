/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPercolateQueries } from './create_percolate_queries';
import { mockRuleId, mockRuleVersion } from './mocks';
import {
  getThreatListItemMock,
  getThreatMappingMock,
} from '../../../signals/threat_mapping/build_threat_mapping_filter.mock';

describe('createPercolateQueries', () => {
  it('creates expected queries', () => {
    const actual = createPercolateQueries({
      ruleId: mockRuleId,
      ruleVersion: mockRuleVersion,
      threatMapping: getThreatMappingMock(),
      threatList: [getThreatListItemMock()],
    });

    expect(actual).toEqual([
      {
        bool: {
          filter: [
            {
              bool: {
                must: [
                  { match: { rule_id: 'abcd-defg-hijk-lmno' } },
                  { match: { rule_version: 1337 } },
                ],
                should: [{ match: { 'host.name': { query: 'host-1' } } }],
                minimum_should_match: 1,
              },
              _name: '123__SEP__threat_index__SEP__host.name__SEP__host.name',
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
                must: [
                  { match: { rule_id: 'abcd-defg-hijk-lmno' } },
                  { match: { rule_version: 1337 } },
                ],
                should: [{ match: { 'host.ip': { query: '192.168.0.0.1' } } }],
                minimum_should_match: 1,
              },
              _name: '123__SEP__threat_index__SEP__host.ip__SEP__host.ip',
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
          ],
          must: [{ match: { rule_id: 'abcd-defg-hijk-lmno' } }, { match: { rule_version: 1337 } }],
          minimum_should_match: 2,
        },
        _name: '123__SEP__threat_index__SEP__host.name__SEP__host.name',
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
          filter: [
            {
              bool: {
                must: [
                  { match: { rule_id: 'abcd-defg-hijk-lmno' } },
                  { match: { rule_version: 1337 } },
                ],
                should: [{ match: { 'destination.ip': { query: '127.0.0.1' } } }],
                minimum_should_match: 1,
              },
              _name: '123__SEP__threat_index__SEP__destination.ip__SEP__destination.ip',
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
                must: [
                  { match: { rule_id: 'abcd-defg-hijk-lmno' } },
                  { match: { rule_version: 1337 } },
                ],
                should: [{ match: { 'destination.port': { query: 1 } } }],
                minimum_should_match: 1,
              },
              _name: '123__SEP__threat_index__SEP__destination.port__SEP__destination.port',
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
          ],
          must: [{ match: { rule_id: 'abcd-defg-hijk-lmno' } }, { match: { rule_version: 1337 } }],
          minimum_should_match: 2,
        },
        _name: '123__SEP__threat_index__SEP__destination.ip__SEP__destination.ip',
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
          should: [{ match: { 'source.port': { query: 1 } } }],
          minimum_should_match: 1,
        },
        _name: '123__SEP__threat_index__SEP__source.port__SEP__source.port',
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
    ]);
  });
});
