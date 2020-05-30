/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FirstLastSeenHost, HostItem, HostsData, HostsEdges } from '../../graphql/types';
import { FrameworkAdapter, FrameworkRequest } from '../framework';

import { ElasticsearchHostsAdapter, formatHostEdgesData } from './elasticsearch_adapter';
import {
  mockGetHostOverviewOptions,
  mockGetHostOverviewRequest,
  mockGetHostOverviewResponse,
  mockGetHostOverviewResult,
  mockGetHostLastFirstSeenOptions,
  mockGetHostLastFirstSeenRequest,
  mockGetHostsOptions,
  mockGetHostsRequest,
  mockGetHostsResponse,
  mockGetHostsResult,
  mockGetHostLastFirstSeenResult,
  mockGetHostLastFirstSeenResponse,
  mockGetHostOverviewRequestDsl,
  mockGetHostLastFirstSeenDsl,
  mockGetHostsQueryDsl,
} from './mock';
import { HostAggEsItem } from './types';

jest.mock('./query.hosts.dsl', () => {
  return {
    buildHostsQuery: jest.fn(() => mockGetHostsQueryDsl),
  };
});

jest.mock('./query.detail_host.dsl', () => {
  return {
    buildHostOverviewQuery: jest.fn(() => mockGetHostOverviewRequestDsl),
  };
});

jest.mock('./query.last_first_seen_host.dsl', () => {
  return {
    buildLastFirstSeenHostQuery: jest.fn(() => mockGetHostLastFirstSeenDsl),
  };
});

describe('hosts elasticsearch_adapter', () => {
  describe('#formatHostsData', () => {
    const buckets: HostAggEsItem = {
      key: 'zeek-london',
      os: {
        hits: {
          total: {
            value: 242338,
            relation: 'eq',
          },
          max_score: null,
          hits: [
            {
              _index: 'auditbeat-8.0.0-2019.09.06-000022',
              _id: 'dl0T_m0BHe9nqdOiF2A8',
              _score: null,
              _source: {
                host: {
                  os: {
                    kernel: '5.0.0-1013-gcp',
                    name: 'Ubuntu',
                    family: 'debian',
                    version: '18.04.2 LTS (Bionic Beaver)',
                    platform: 'ubuntu',
                  },
                },
              },
              sort: [1571925726017],
            },
          ],
        },
      },
    };

    test('it formats a host with a source of name correctly', () => {
      const fields: readonly string[] = ['host.name'];
      const data = formatHostEdgesData(fields, buckets);
      const expected: HostsEdges = {
        cursor: { tiebreaker: null, value: 'zeek-london' },
        node: { host: { name: 'zeek-london' }, _id: 'zeek-london' },
      };

      expect(data).toEqual(expected);
    });

    test('it formats a host with a source of os correctly', () => {
      const fields: readonly string[] = ['host.os.name'];
      const data = formatHostEdgesData(fields, buckets);
      const expected: HostsEdges = {
        cursor: { tiebreaker: null, value: 'zeek-london' },
        node: { host: { os: { name: 'Ubuntu' } }, _id: 'zeek-london' },
      };

      expect(data).toEqual(expected);
    });

    test('it formats a host with a source of version correctly', () => {
      const fields: readonly string[] = ['host.os.version'];
      const data = formatHostEdgesData(fields, buckets);
      const expected: HostsEdges = {
        cursor: { tiebreaker: null, value: 'zeek-london' },
        node: { host: { os: { version: '18.04.2 LTS (Bionic Beaver)' } }, _id: 'zeek-london' },
      };

      expect(data).toEqual(expected);
    });

    test('it formats a host with a source of id correctly', () => {
      const fields: readonly string[] = ['host.name'];
      const data = formatHostEdgesData(fields, buckets);
      const expected: HostsEdges = {
        cursor: { tiebreaker: null, value: 'zeek-london' },
        node: { _id: 'zeek-london', host: { name: 'zeek-london' } },
      };

      expect(data).toEqual(expected);
    });

    test('it formats a host with a source of name, lastBeat, os, and version correctly', () => {
      const fields: readonly string[] = ['host.name', 'host.os.name', 'host.os.version'];
      const data = formatHostEdgesData(fields, buckets);
      const expected: HostsEdges = {
        cursor: { tiebreaker: null, value: 'zeek-london' },
        node: {
          _id: 'zeek-london',
          host: {
            name: 'zeek-london',
            os: { name: 'Ubuntu', version: '18.04.2 LTS (Bionic Beaver)' },
          },
        },
      };

      expect(data).toEqual(expected);
    });

    test('it formats a host without any data if fields are empty', () => {
      const fields: readonly string[] = [];
      const data = formatHostEdgesData(fields, buckets);
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

  describe('#getHosts', () => {
    const mockCallWithRequest = jest.fn();
    mockCallWithRequest.mockResolvedValue(mockGetHostsResponse);
    const mockFramework: FrameworkAdapter = {
      callWithRequest: mockCallWithRequest,
      registerGraphQLEndpoint: jest.fn(),
      getIndexPatternsService: jest.fn(),
    };
    jest.doMock('../framework', () => ({ callWithRequest: mockCallWithRequest }));

    test('Happy Path', async () => {
      const EsHosts = new ElasticsearchHostsAdapter(mockFramework);
      const data: HostsData = await EsHosts.getHosts(
        mockGetHostsRequest as FrameworkRequest,
        mockGetHostsOptions
      );
      expect(data).toEqual(mockGetHostsResult);
    });
  });

  describe('#getHostOverview', () => {
    const mockCallWithRequest = jest.fn();
    mockCallWithRequest.mockResolvedValue(mockGetHostOverviewResponse);
    const mockFramework: FrameworkAdapter = {
      callWithRequest: mockCallWithRequest,
      registerGraphQLEndpoint: jest.fn(),
      getIndexPatternsService: jest.fn(),
    };
    jest.doMock('../framework', () => ({ callWithRequest: mockCallWithRequest }));

    test('Happy Path', async () => {
      const EsHosts = new ElasticsearchHostsAdapter(mockFramework);
      const data: HostItem = await EsHosts.getHostOverview(
        mockGetHostOverviewRequest as FrameworkRequest,
        mockGetHostOverviewOptions
      );
      expect(data).toEqual(mockGetHostOverviewResult);
    });
  });

  describe('#getHostLastFirstSeen', () => {
    const mockCallWithRequest = jest.fn();
    mockCallWithRequest.mockResolvedValue(mockGetHostLastFirstSeenResponse);
    const mockFramework: FrameworkAdapter = {
      callWithRequest: mockCallWithRequest,
      registerGraphQLEndpoint: jest.fn(),
      getIndexPatternsService: jest.fn(),
    };
    jest.doMock('../framework', () => ({ callWithRequest: mockCallWithRequest }));

    test('Happy Path', async () => {
      const EsHosts = new ElasticsearchHostsAdapter(mockFramework);
      const data: FirstLastSeenHost = await EsHosts.getHostFirstLastSeen(
        mockGetHostLastFirstSeenRequest as FrameworkRequest,
        mockGetHostLastFirstSeenOptions
      );
      expect(data).toEqual(mockGetHostLastFirstSeenResult);
    });
  });
});
