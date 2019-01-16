/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AuthorizationsEdges } from '../../graphql/types';
import { formatAuthorizationData } from './elasticsearch_adapter';
import { auditdFieldsMap } from './query.dsl';
import { AuthorizationHit } from './types';

describe('authorizations elasticsearch_adapter', () => {
  describe('#formatAuthorizationsData', () => {
    const hit: AuthorizationHit = {
      _index: 'index-123',
      _type: 'type-123',
      _id: 'id-123',
      _score: 10,
      _source: {
        '@timestamp': 'time-1',
        source: {
          ip: '192.168.0.1',
        },
        host: {
          id: 'host-id-1',
          ip: '127.0.0.1',
          name: 'host-name-1',
        },
      },
      cursor: 'cursor-1',
      sort: [0],
      user: 'Evan',
      failures: 10,
      successes: 20,
    };

    test('it formats a authorizations with an empty set', () => {
      const fields: ReadonlyArray<string> = [''];
      const data = formatAuthorizationData(fields, hit, auditdFieldsMap);
      const expected: AuthorizationsEdges = {
        cursor: {
          tiebreaker: null,
          value: 'cursor-1',
        },
        node: {
          _id: 'id-123',
          failures: 10,
          successes: 20,
          latest: '',
          host: {
            id: '',
            name: '',
          },
          user: {
            name: 'Evan',
          },
          source: {
            ip: '',
          },
        },
      };

      expect(data).toEqual(expected);
    });

    test('it formats a authorizations with a source ip correctly', () => {
      const fields: ReadonlyArray<string> = ['source.ip'];
      const data = formatAuthorizationData(fields, hit, auditdFieldsMap);
      const expected: AuthorizationsEdges = {
        cursor: {
          tiebreaker: null,
          value: 'cursor-1',
        },
        node: {
          _id: 'id-123',
          failures: 10,
          successes: 20,
          latest: '',
          host: {
            id: '',
            name: '',
          },
          user: {
            name: 'Evan',
          },
          source: {
            ip: '192.168.0.1',
          },
        },
      };

      expect(data).toEqual(expected);
    });

    test('it formats a authorizations with a host name only', () => {
      const fields: ReadonlyArray<string> = ['host.name'];
      const data = formatAuthorizationData(fields, hit, auditdFieldsMap);
      const expected: AuthorizationsEdges = {
        cursor: {
          tiebreaker: null,
          value: 'cursor-1',
        },
        node: {
          _id: 'id-123',
          failures: 10,
          successes: 20,
          latest: '',
          host: {
            id: '',
            name: 'host-name-1',
          },
          user: {
            name: 'Evan',
          },
          source: {
            ip: '',
          },
        },
      };

      expect(data).toEqual(expected);
    });

    test('it formats a authorizations with a host id only', () => {
      const fields: ReadonlyArray<string> = ['host.id'];
      const data = formatAuthorizationData(fields, hit, auditdFieldsMap);
      const expected: AuthorizationsEdges = {
        cursor: {
          tiebreaker: null,
          value: 'cursor-1',
        },
        node: {
          _id: 'id-123',
          failures: 10,
          successes: 20,
          latest: '',
          host: {
            id: 'host-id-1',
            name: '',
          },
          user: {
            name: 'Evan',
          },
          source: {
            ip: '',
          },
        },
      };

      expect(data).toEqual(expected);
    });

    test('it formats a authorizations with a host name and id correctly', () => {
      const fields: ReadonlyArray<string> = ['host.name', 'host.id'];
      const data = formatAuthorizationData(fields, hit, auditdFieldsMap);
      const expected: AuthorizationsEdges = {
        cursor: {
          tiebreaker: null,
          value: 'cursor-1',
        },
        node: {
          _id: 'id-123',
          failures: 10,
          successes: 20,
          latest: '',
          host: {
            id: 'host-id-1',
            name: 'host-name-1',
          },
          user: {
            name: 'Evan',
          },
          source: {
            ip: '',
          },
        },
      };

      expect(data).toEqual(expected);
    });
  });
});
