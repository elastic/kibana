/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { formatHostsData } from './elasticsearch_adapter';
import { hostsFieldsMap } from './query.dsl';
import { HostHit } from './types';

describe('hosts elasticsearch_adapter', () => {
  describe('#formatHostsData', () => {
    const hit: HostHit = {
      _index: 'index-123',
      _type: 'type-123',
      _id: 'id-123',
      _score: 10,
      _source: {
        '@timestamp': 'time-1',
        host: {
          name: 'host-name-1',
          os: {
            name: 'os-name-1',
            version: 'version-1',
          },
        },
      },
      cursor: 'cursor-1',
      sort: [0],
    };

    test('it formats a host with a source of firstSeen correctly', () => {
      const fields: ReadonlyArray<string> = ['firstSeen'];
      const data = formatHostsData(fields, hit, hostsFieldsMap);
      expect(data).toEqual({
        cursor: {
          tiebreaker: null,
          value: 'cursor-1',
        },
        host: {
          firstSeen: 'time-1',
          _id: 'id-123',
        },
      });
    });

    test('it formats a host with a source of name correctly', () => {
      const fields: ReadonlyArray<string> = ['name'];
      const data = formatHostsData(fields, hit, hostsFieldsMap);
      expect(data).toEqual({
        cursor: {
          tiebreaker: null,
          value: 'cursor-1',
        },
        host: {
          name: 'host-name-1',
          _id: 'id-123',
        },
      });
    });

    test('it formats a host with a source of os correctly', () => {
      const fields: ReadonlyArray<string> = ['os'];
      const data = formatHostsData(fields, hit, hostsFieldsMap);
      expect(data).toEqual({
        cursor: {
          tiebreaker: null,
          value: 'cursor-1',
        },
        host: {
          os: 'os-name-1',
          _id: 'id-123',
        },
      });
    });

    test('it formats a host with a source of version correctly', () => {
      const fields: ReadonlyArray<string> = ['version'];
      const data = formatHostsData(fields, hit, hostsFieldsMap);
      expect(data).toEqual({
        cursor: {
          tiebreaker: null,
          value: 'cursor-1',
        },
        host: {
          version: 'version-1',
          _id: 'id-123',
        },
      });
    });

    test('it formats a host with a source of name and firstSeen correctly', () => {
      const fields: ReadonlyArray<string> = ['name', 'firstSeen'];
      const data = formatHostsData(fields, hit, hostsFieldsMap);
      expect(data).toEqual({
        cursor: {
          tiebreaker: null,
          value: 'cursor-1',
        },
        host: {
          _id: 'id-123',
          name: 'host-name-1',
          firstSeen: 'time-1',
        },
      });
    });

    test('it formats a host with a source of name, firstSeen, os, and version correctly', () => {
      const fields: ReadonlyArray<string> = ['name', 'firstSeen', 'os', 'version'];
      const data = formatHostsData(fields, hit, hostsFieldsMap);
      expect(data).toEqual({
        cursor: {
          tiebreaker: null,
          value: 'cursor-1',
        },
        host: {
          _id: 'id-123',
          name: 'host-name-1',
          firstSeen: 'time-1',
          os: 'os-name-1',
          version: 'version-1',
        },
      });
    });

    test('it formats a host without any data if fields are empty', () => {
      const fields: ReadonlyArray<string> = [];
      const data = formatHostsData(fields, hit, hostsFieldsMap);
      expect(data).toEqual({
        cursor: {
          tiebreaker: null,
          value: '',
        },
        host: {},
      });
    });
  });
});
