/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthenticationsEdges } from '../../../../../../common/search_strategy';
import { auditdFieldsMap } from './dsl/query.dsl';

import { formatAuthenticationData } from './helpers';
import { mockHit } from './__mocks__';

describe('#formatAuthenticationsData', () => {
  test('it formats a authentication with an empty set', () => {
    const fields: readonly string[] = [''];
    const data = formatAuthenticationData(fields, mockHit, auditdFieldsMap);
    const expected: AuthenticationsEdges = {
      cursor: {
        tiebreaker: null,
        value: 'cursor-1',
      },
      node: {
        _id: 'id-123',
        failures: 10,
        successes: 20,
        stackedValue: ['Evan'],
      },
    };

    expect(data).toEqual(expected);
  });

  test('it formats a authentications with a source ip correctly', () => {
    const fields: readonly string[] = ['lastSuccess.source.ip'];
    const data = formatAuthenticationData(fields, mockHit, auditdFieldsMap);
    const expected: AuthenticationsEdges = {
      cursor: {
        tiebreaker: null,
        value: 'cursor-1',
      },
      node: {
        _id: 'id-123',
        failures: 10,
        successes: 20,
        stackedValue: ['Evan'],
      },
    };

    expect(data).toEqual(expected);
  });

  test('it formats a authentications with a host name only', () => {
    const fields: readonly string[] = ['lastSuccess.host.name'];
    const data = formatAuthenticationData(fields, mockHit, auditdFieldsMap);
    const expected: AuthenticationsEdges = {
      cursor: {
        tiebreaker: null,
        value: 'cursor-1',
      },
      node: {
        _id: 'id-123',
        failures: 10,
        successes: 20,
        stackedValue: ['Evan'],
      },
    };

    expect(data).toEqual(expected);
  });

  test('it formats a authentications with a host id only', () => {
    const fields: readonly string[] = ['lastSuccess.host.id'];
    const data = formatAuthenticationData(fields, mockHit, auditdFieldsMap);
    const expected: AuthenticationsEdges = {
      cursor: {
        tiebreaker: null,
        value: 'cursor-1',
      },
      node: {
        _id: 'id-123',
        failures: 10,
        successes: 20,
        stackedValue: ['Evan'],
      },
    };

    expect(data).toEqual(expected);
  });

  test('it formats a authentications with a host name and id correctly', () => {
    const fields: readonly string[] = ['lastSuccess.host.name', 'lastSuccess.host.id'];
    const data = formatAuthenticationData(fields, mockHit, auditdFieldsMap);
    const expected: AuthenticationsEdges = {
      cursor: {
        tiebreaker: null,
        value: 'cursor-1',
      },
      node: {
        _id: 'id-123',
        failures: 10,
        successes: 20,
        stackedValue: ['Evan'],
      },
    };

    expect(data).toEqual(expected);
  });
});
