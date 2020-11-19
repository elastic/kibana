/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HostsEdges } from '../../../../../../common/search_strategy/security_solution';

import { formatHostEdgesData } from './helpers';
import { mockBuckets } from './__mocks__';

describe('#formatHostsData', () => {
  test('it formats a host with a source of name correctly', () => {
    const mockFields: readonly string[] = ['host.name'];
    const data = formatHostEdgesData(mockFields, mockBuckets);
    const expected: HostsEdges = {
      cursor: { tiebreaker: null, value: 'zeek-london' },
      node: { host: { name: ['zeek-london'] }, _id: 'zeek-london' },
    };

    expect(data).toEqual(expected);
  });

  test('it formats a host with a source of os correctly', () => {
    const mockFields: readonly string[] = ['host.os.name'];
    const data = formatHostEdgesData(mockFields, mockBuckets);
    const expected: HostsEdges = {
      cursor: { tiebreaker: null, value: 'zeek-london' },
      node: { host: { os: { name: ['Ubuntu'] } }, _id: 'zeek-london' },
    };

    expect(data).toEqual(expected);
  });

  test('it formats a host with a source of version correctly', () => {
    const mockFields: readonly string[] = ['host.os.version'];
    const data = formatHostEdgesData(mockFields, mockBuckets);
    const expected: HostsEdges = {
      cursor: { tiebreaker: null, value: 'zeek-london' },
      node: { host: { os: { version: ['18.04.2 LTS (Bionic Beaver)'] } }, _id: 'zeek-london' },
    };

    expect(data).toEqual(expected);
  });

  test('it formats a host with a source of id correctly', () => {
    const mockFields: readonly string[] = ['host.name'];
    const data = formatHostEdgesData(mockFields, mockBuckets);
    const expected: HostsEdges = {
      cursor: { tiebreaker: null, value: 'zeek-london' },
      node: { _id: 'zeek-london', host: { name: ['zeek-london'] } },
    };

    expect(data).toEqual(expected);
  });

  test('it formats a host with a source of name, lastBeat, os, and version correctly', () => {
    const mockFields: readonly string[] = ['host.name', 'host.os.name', 'host.os.version'];
    const data = formatHostEdgesData(mockFields, mockBuckets);
    const expected: HostsEdges = {
      cursor: { tiebreaker: null, value: 'zeek-london' },
      node: {
        _id: 'zeek-london',
        host: {
          name: ['zeek-london'],
          os: { name: ['Ubuntu'], version: ['18.04.2 LTS (Bionic Beaver)'] },
        },
      },
    };

    expect(data).toEqual(expected);
  });

  test('it formats a host without any data if mockFields are empty', () => {
    const mockFields: readonly string[] = [];
    const data = formatHostEdgesData(mockFields, mockBuckets);
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
