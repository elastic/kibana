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
  mockGetHostLastFirstSeenResponse,
  mockGetHostsOptions,
  mockGetHostsRequest,
  mockGetHostsResponse,
  mockGetHostsResult,
} from './mock';
import { HostAggEsItem } from './types';

describe('hosts elasticsearch_adapter', () => {
  describe('#formatHostsData', () => {
    const buckets: HostAggEsItem = {
      key: 'zeek-london',
      host_os_version: {
        buckets: [
          {
            key: '18.04.2 LTS (Bionic Beaver)',
            doc_count: 1467783,
            timestamp: { value: 1554516350177, value_as_string: '2019-04-06T02:05:50.177Z' },
          },
        ],
      },
      host_os_name: {
        buckets: [
          {
            key: 'Ubuntu',
            doc_count: 1467783,
            timestamp: { value: 1554516350177, value_as_string: '2019-04-06T02:05:50.177Z' },
          },
        ],
      },
      host_name: {
        buckets: [
          {
            key: 'zeek-london',
            doc_count: 1467783,
            timestamp: { value: 1554516350177, value_as_string: '2019-04-06T02:05:50.177Z' },
          },
        ],
      },
      host_id: {
        buckets: [
          {
            key: '7c21f5ed03b04d0299569d221fe18bbc',
            doc_count: 1467783,
            timestamp: { value: 1554516350177, value_as_string: '2019-04-06T02:05:50.177Z' },
          },
        ],
      },
    };

    test('it formats a host with a source of name correctly', () => {
      const fields: ReadonlyArray<string> = ['host.name'];
      const data = formatHostEdgesData(fields, buckets);
      const expected: HostsEdges = {
        cursor: { tiebreaker: null, value: 'zeek-london' },
        node: { host: { name: 'zeek-london' }, _id: 'zeek-london' },
      };

      expect(data).toEqual(expected);
    });

    test('it formats a host with a source of os correctly', () => {
      const fields: ReadonlyArray<string> = ['host.os.name'];
      const data = formatHostEdgesData(fields, buckets);
      const expected: HostsEdges = {
        cursor: { tiebreaker: null, value: 'zeek-london' },
        node: { host: { os: { name: 'Ubuntu' } }, _id: 'zeek-london' },
      };

      expect(data).toEqual(expected);
    });

    test('it formats a host with a source of version correctly', () => {
      const fields: ReadonlyArray<string> = ['host.os.version'];
      const data = formatHostEdgesData(fields, buckets);
      const expected: HostsEdges = {
        cursor: { tiebreaker: null, value: 'zeek-london' },
        node: { host: { os: { version: '18.04.2 LTS (Bionic Beaver)' } }, _id: 'zeek-london' },
      };

      expect(data).toEqual(expected);
    });

    test('it formats a host with a source of id correctly', () => {
      const fields: ReadonlyArray<string> = ['host.name'];
      const data = formatHostEdgesData(fields, buckets);
      const expected: HostsEdges = {
        cursor: { tiebreaker: null, value: 'zeek-london' },
        node: { _id: 'zeek-london', host: { name: 'zeek-london' } },
      };

      expect(data).toEqual(expected);
    });

    test('it formats a host with a source of name, lastBeat, os, and version correctly', () => {
      const fields: ReadonlyArray<string> = ['host.name', 'host.os.name', 'host.os.version'];
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
      const fields: ReadonlyArray<string> = [];
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
      version: 'mock',
      callWithRequest: mockCallWithRequest,
      exposeStaticDir: jest.fn(),
      registerGraphQLEndpoint: jest.fn(),
      getIndexPatternsService: jest.fn(),
      getSavedObjectsService: jest.fn(),
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
      version: 'mock',
      callWithRequest: mockCallWithRequest,
      exposeStaticDir: jest.fn(),
      registerGraphQLEndpoint: jest.fn(),
      getIndexPatternsService: jest.fn(),
      getSavedObjectsService: jest.fn(),
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
      version: 'mock',
      callWithRequest: mockCallWithRequest,
      exposeStaticDir: jest.fn(),
      registerGraphQLEndpoint: jest.fn(),
      getIndexPatternsService: jest.fn(),
      getSavedObjectsService: jest.fn(),
    };
    jest.doMock('../framework', () => ({ callWithRequest: mockCallWithRequest }));

    test('Happy Path', async () => {
      const EsHosts = new ElasticsearchHostsAdapter(mockFramework);
      const data: FirstLastSeenHost = await EsHosts.getHostFirstLastSeen(
        mockGetHostLastFirstSeenRequest as FrameworkRequest,
        mockGetHostLastFirstSeenOptions
      );
      expect(data).toEqual({
        firstSeen: '2019-02-22T03:41:32.826Z',
        lastSeen: '2019-04-09T16:18:12.178Z',
      });
    });
  });
});
