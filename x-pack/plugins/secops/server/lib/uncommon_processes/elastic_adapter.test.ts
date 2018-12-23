/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { formatUncommonProcessesData, getHosts } from './elasticsearch_adapter';
import { processFieldsMap } from './query.dsl';
import { UncommonProcessBucket, UncommonProcessHit } from './types';

describe('elasticsearch_adapter', () => {
  describe('#getHosts', () => {
    const bucket1: UncommonProcessBucket = {
      key: '123',
      hosts: {
        buckets: [],
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
        buckets: [],
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
      const hosts = getHosts([bucket1]);
      expect(hosts).toEqual(['123']);
    });

    test('will return two hosts correctly', () => {
      const hosts = getHosts([bucket1, bucket2]);
      expect(hosts).toEqual(['123', '345']);
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
      hosts: ['host-1', 'host-2'],
      _source: {
        '@timestamp': 'time',
        process: {
          name: 'process-1',
          title: 'title-1',
        },
        host: {
          name: 'name-1',
        },
      },
      cursor: 'cursor-1',
      sort: [0],
    };

    test('it formats a uncommon process data with a source of name correctly', () => {
      const fields: ReadonlyArray<string> = ['name'];
      const data = formatUncommonProcessesData(fields, hit, processFieldsMap);
      expect(data).toEqual({
        cursor: {
          tiebreaker: null,
          value: 'cursor-1',
        },
        uncommonProcess: {
          name: 'process-1',
          _id: 'id-123',
          hosts: ['host-1', 'host-2'],
          instances: 100,
        },
      });
    });

    test('it formats a uncommon process data with a source of name and title correctly', () => {
      const fields: ReadonlyArray<string> = ['name', 'title'];
      const data = formatUncommonProcessesData(fields, hit, processFieldsMap);
      expect(data).toEqual({
        cursor: {
          tiebreaker: null,
          value: 'cursor-1',
        },
        uncommonProcess: {
          name: 'process-1',
          title: 'title-1',
          _id: 'id-123',
          hosts: ['host-1', 'host-2'],
          instances: 100,
        },
      });
    });

    test('it formats a uncommon process data without any data if fields is empty', () => {
      const fields: ReadonlyArray<string> = [];
      const data = formatUncommonProcessesData(fields, hit, processFieldsMap);
      expect(data).toEqual({
        cursor: {
          tiebreaker: null,
          value: '',
        },
        uncommonProcess: {},
      });
    });
  });
});
