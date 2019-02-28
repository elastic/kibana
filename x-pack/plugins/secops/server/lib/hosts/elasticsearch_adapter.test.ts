/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { HostsEdges } from '../../graphql/types';

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
        '@timestamp': 'time-2',
        host: {
          name: 'host-name-1',
          os: {
            name: 'os-name-1',
            version: 'version-1',
          },
        },
      },
      firstSeen: 'time-1',
      cursor: 'cursor-1',
      sort: [0],
    };

    test('it formats a host with firstSeen correctly', () => {
      const fields: ReadonlyArray<string> = ['firstSeen'];
      const data = formatHostsData(fields, hit, hostsFieldsMap);
      const expected: HostsEdges = {
        cursor: {
          tiebreaker: null,
          value: 'cursor-1',
        },
        node: {
          firstSeen: 'time-1',
          _id: 'id-123',
        },
      };

      expect(data).toEqual(expected);
    });

    test('it formats a host with a source of lastBeat correctly', () => {
      const fields: ReadonlyArray<string> = ['lastBeat'];
      const data = formatHostsData(fields, hit, hostsFieldsMap);
      const expected: HostsEdges = {
        cursor: {
          tiebreaker: null,
          value: 'cursor-1',
        },
        node: {
          firstSeen: 'time-1',
          lastBeat: 'time-2',
          _id: 'id-123',
        },
      };

      expect(data).toEqual(expected);
    });

    test('it formats a host with a source of name correctly', () => {
      const fields: ReadonlyArray<string> = ['host.name'];
      const data = formatHostsData(fields, hit, hostsFieldsMap);
      const expected: HostsEdges = {
        cursor: {
          tiebreaker: null,
          value: 'cursor-1',
        },
        node: {
          firstSeen: 'time-1',
          host: {
            name: 'host-name-1',
          },
          _id: 'id-123',
        },
      };

      expect(data).toEqual(expected);
    });

    test('it formats a host with a source of os correctly', () => {
      const fields: ReadonlyArray<string> = ['host.os.name'];
      const data = formatHostsData(fields, hit, hostsFieldsMap);
      const expected: HostsEdges = {
        cursor: {
          tiebreaker: null,
          value: 'cursor-1',
        },
        node: {
          firstSeen: 'time-1',
          host: {
            os: {
              name: 'os-name-1',
            },
          },
          _id: 'id-123',
        },
      };

      expect(data).toEqual(expected);
    });

    test('it formats a host with a source of version correctly', () => {
      const fields: ReadonlyArray<string> = ['host.os.version'];
      const data = formatHostsData(fields, hit, hostsFieldsMap);
      const expected: HostsEdges = {
        cursor: {
          tiebreaker: null,
          value: 'cursor-1',
        },
        node: {
          firstSeen: 'time-1',
          host: {
            os: {
              version: 'version-1',
            },
          },
          _id: 'id-123',
        },
      };

      expect(data).toEqual(expected);
    });

    test('it formats a host with a source of name correctly', () => {
      const fields: ReadonlyArray<string> = ['host.name'];
      const data = formatHostsData(fields, hit, hostsFieldsMap);
      const expected: HostsEdges = {
        cursor: {
          tiebreaker: null,
          value: 'cursor-1',
        },
        node: {
          _id: 'id-123',
          host: {
            name: 'host-name-1',
          },
          firstSeen: 'time-1',
        },
      };

      expect(data).toEqual(expected);
    });

    test('it formats a host with a source of name, lastBeat, os, and version correctly', () => {
      const fields: ReadonlyArray<string> = [
        'lastBeat',
        'host.name',
        'host.os.name',
        'host.os.version',
      ];
      const data = formatHostsData(fields, hit, hostsFieldsMap);
      const expected: HostsEdges = {
        cursor: {
          tiebreaker: null,
          value: 'cursor-1',
        },
        node: {
          _id: 'id-123',
          host: {
            name: 'host-name-1',
            os: {
              name: 'os-name-1',
              version: 'version-1',
            },
          },
          firstSeen: 'time-1',
          lastBeat: 'time-2',
        },
      };

      expect(data).toEqual(expected);
    });

    test('it formats a host without any data if fields are empty', () => {
      const fields: ReadonlyArray<string> = [];
      const data = formatHostsData(fields, hit, hostsFieldsMap);
      const expected: HostsEdges = {
        cursor: {
          tiebreaker: null,
          value: '',
        },
        node: {},
      };

      expect(data).toEqual(expected);
    });
  });
});
