/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { processFieldsMap } from '@kbn/securitysolution-ecs';

import type {
  HostsUncommonProcessesEdges,
  HostsUncommonProcessHit,
} from '../../../../../../common/search_strategy';

import type { UncommonProcessBucket } from './helpers';
import { formatUncommonProcessesData, getHosts } from './helpers';

describe('helpers', () => {
  describe('#getHosts', () => {
    const bucket1: UncommonProcessBucket = {
      key: '123',
      hosts: {
        buckets: [
          {
            key: '123',
            host: {
              hits: {
                total: 0,
                max_score: 0,
                hits: [
                  {
                    _index: 'hit-1',
                    _type: 'type-1',
                    _id: 'id-1',
                    _score: 0,
                    fields: {
                      'host.id': ['host-id-1'],
                      'host.name': ['host-1'],
                    },
                  },
                ],
              },
            },
          },
        ],
      },
      process: {
        hits: {
          total: {
            value: 1,
            relation: 'eq',
          },
          max_score: 5,
          hits: [],
        },
      },
    };
    const bucket2: UncommonProcessBucket = {
      key: '345',
      hosts: {
        buckets: [
          {
            key: '123',
            host: {
              hits: {
                total: 0,
                max_score: 0,
                hits: [
                  {
                    _index: 'hit-1',
                    _type: 'type-1',
                    _id: 'id-1',
                    _score: 0,
                    fields: {
                      'host.id': ['host-id-1'],
                      'host.name': ['host-1'],
                    },
                  },
                ],
              },
            },
          },
          {
            key: '345',
            host: {
              hits: {
                total: 0,
                max_score: 0,
                hits: [
                  {
                    _index: 'hit-2',
                    _type: 'type-2',
                    _id: 'id-2',
                    _score: 0,
                    fields: {
                      'host.id': ['host-id-2'],
                      'host.name': ['host-2'],
                    },
                  },
                ],
              },
            },
          },
        ],
      },
      process: {
        hits: {
          total: {
            value: 1,
            relation: 'eq',
          },
          max_score: 5,
          hits: [],
        },
      },
    };
    const bucket3: UncommonProcessBucket = {
      key: '789',
      hosts: {
        buckets: [
          {
            key: '789',
            host: {
              hits: {
                total: 0,
                max_score: 0,
                hits: [
                  {
                    _index: 'hit-9',
                    _type: 'type-9',
                    _id: 'id-9',
                    _score: 0,
                    fields: {
                      'host.id': ['host-id-9'],
                      'host.name': ['host-9'],
                    },
                  },
                ],
              },
            },
          },
        ],
      },
      process: {
        hits: {
          total: {
            value: 1,
            relation: 'eq',
          },
          max_score: 5,
          hits: [],
        },
      },
    };

    test('will return a single host correctly', () => {
      const hosts = getHosts(bucket1.hosts.buckets);
      expect(hosts).toEqual([{ id: ['123'], name: ['host-1'] }]);
    });

    test('will return two hosts correctly', () => {
      const hosts = getHosts(bucket2.hosts.buckets);
      expect(hosts).toEqual([
        { id: ['123'], name: ['host-1'] },
        { id: ['345'], name: ['host-2'] },
      ]);
    });

    test('will return a dot notation host', () => {
      const hosts = getHosts(bucket3.hosts.buckets);
      expect(hosts).toEqual([{ id: ['789'], name: ['host-9'] }]);
    });

    test('will return no hosts when given an empty array', () => {
      const hosts = getHosts([]);
      expect(hosts).toEqual([]);
    });
  });

  describe('#formatUncommonProcessesData', () => {
    const hit: HostsUncommonProcessHit = {
      _index: 'index-123',
      _type: 'type-123',
      _id: 'id-123',
      _score: 10,
      total: {
        value: 100,
        relation: 'eq',
      },
      host: [
        { id: ['host-id-1'], name: ['host-name-1'] },
        { id: ['host-id-1'], name: ['host-name-1'] },
      ],
      fields: {
        '@timestamp': ['time'],
        'process.name': ['process-1'],
        'process.args': ['args-1'],
      },
      cursor: 'cursor-1',
      sort: [0],
    };

    test('it formats a uncommon process data with a source of name and title correctly', () => {
      const data = formatUncommonProcessesData(hit, processFieldsMap);
      const expected: HostsUncommonProcessesEdges = {
        cursor: { tiebreaker: null, value: 'cursor-1' },
        node: {
          _id: 'id-123',
          hosts: [
            { id: ['host-id-1'], name: ['host-name-1'] },
            { id: ['host-id-1'], name: ['host-name-1'] },
          ],
          instances: 100,
          process: {
            name: ['process-1'],
            args: ['args-1'],
          },
        },
      };
      expect(data).toEqual(expected);
    });

    test('it formats a uncommon process data without any data if fields map is empty', () => {
      const emptyHit: HostsUncommonProcessHit = {
        _index: 'index-123',
        _type: 'type-123',
        _id: 'id-123',
        _score: 10,
        total: {
          value: 0,
          relation: 'eq',
        },
        host: [],
        fields: {},
        cursor: '',
        sort: [0],
      };
      const data = formatUncommonProcessesData(emptyHit, processFieldsMap);
      const expected: HostsUncommonProcessesEdges = {
        cursor: {
          tiebreaker: null,
          value: '',
        },
        node: {
          _id: 'id-123',
          hosts: [],
          instances: 0,
          process: {},
        },
      };
      expect(data).toEqual(expected);
    });
  });
});
