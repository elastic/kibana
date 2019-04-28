/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { UncommonProcessesEdges } from '../../graphql/types';
import { processFieldsMap } from '../ecs_fields';

import { formatUncommonProcessesData, getHosts } from './elasticsearch_adapter';
import { UncommonProcessBucket, UncommonProcessHit } from './types';

describe('elasticsearch_adapter', () => {
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
                    _source: {
                      host: {
                        name: ['host-1'],
                        id: ['host-id-1'],
                      },
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
                    _source: {
                      host: {
                        name: ['host-1'],
                        id: ['host-id-1'],
                      },
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
                    _source: {
                      host: {
                        name: ['host-2'],
                        id: ['host-id-2'],
                      },
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
      expect(hosts).toEqual([{ id: ['123'], name: ['host-1'] }, { id: ['345'], name: ['host-2'] }]);
    });

    test('will return no hosts when given an empty array', () => {
      const hosts = getHosts([]);
      expect(hosts).toEqual([]);
    });
  });

  describe('#formatUncommonProcessesData', () => {
    const hit: UncommonProcessHit = {
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
      _source: {
        '@timestamp': 'time',
        process: {
          name: ['process-1'],
          title: ['title-1'],
        },
      },
      cursor: 'cursor-1',
      sort: [0],
    };

    test('it formats a uncommon process data with a source of name correctly', () => {
      const fields: ReadonlyArray<string> = ['process.name'];
      const data = formatUncommonProcessesData(fields, hit, processFieldsMap);
      const expected: UncommonProcessesEdges = {
        cursor: { tiebreaker: null, value: 'cursor-1' },
        node: {
          _id: 'id-123',
          hosts: [
            { id: ['host-id-1'], name: ['host-name-1'] },
            { id: ['host-id-1'], name: ['host-name-1'] },
          ],
          process: {
            name: ['process-1'],
          },
          instances: 100,
        },
      };
      expect(data).toEqual(expected);
    });

    test('it formats a uncommon process data with a source of name and title correctly', () => {
      const fields: ReadonlyArray<string> = ['process.name', 'process.title'];
      const data = formatUncommonProcessesData(fields, hit, processFieldsMap);
      const expected: UncommonProcessesEdges = {
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
            title: ['title-1'],
          },
        },
      };
      expect(data).toEqual(expected);
    });

    test('it formats a uncommon process data without any data if fields is empty', () => {
      const fields: ReadonlyArray<string> = [];
      const data = formatUncommonProcessesData(fields, hit, processFieldsMap);
      const expected: UncommonProcessesEdges = {
        cursor: {
          tiebreaker: null,
          value: '',
        },
        node: {
          _id: '',
          hosts: [],
          instances: 0,
          process: {},
        },
      };
      expect(data).toEqual(expected);
    });
  });
});
