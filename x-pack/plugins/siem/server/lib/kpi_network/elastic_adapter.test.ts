/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  mockMsearchOptions,
  mockOptions,
  mockRequest,
  mockResponse,
  mockResult,
  mockNetworkEventsQueryDsl,
  mockUniqueFlowIdsQueryDsl,
  mockUniquePrvateIpsQueryDsl,
  mockDnsQueryDsl,
  mockTlsHandshakesQueryDsl,
  mockResultNoData,
  mockResponseNoData,
} from './mock';
import { buildNetworkEventsQuery } from './query_network_events';
import { buildUniqueFlowIdsQuery } from './query_unique_flow';
import { buildDnsQuery } from './query_dns.dsl';
import { buildTlsHandshakeQuery } from './query_tls_handshakes.dsl';
import { buildUniquePrvateIpQuery } from './query_unique_private_ips.dsl';
import { KpiNetworkData } from '../../graphql/types';
import { ElasticsearchKpiNetworkAdapter } from './elasticsearch_adapter';
import { FrameworkRequest, FrameworkAdapter } from '../framework';

jest.mock('./query_network_events', () => {
  return { buildNetworkEventsQuery: jest.fn() };
});
jest.mock('./query_unique_flow', () => {
  return { buildUniqueFlowIdsQuery: jest.fn() };
});
jest.mock('./query_dns.dsl', () => {
  return { buildDnsQuery: jest.fn() };
});
jest.mock('./query_tls_handshakes.dsl', () => {
  return { buildTlsHandshakeQuery: jest.fn() };
});
jest.mock('./query_unique_private_ips.dsl', () => {
  return { buildUniquePrvateIpQuery: jest.fn() };
});

describe('Network Kpi elasticsearch_adapter', () => {
  let data: KpiNetworkData;

  const mockCallWithRequest = jest.fn();
  const mockFramework: FrameworkAdapter = {
    callWithRequest: mockCallWithRequest,
    registerGraphQLEndpoint: jest.fn(),
    getIndexPatternsService: jest.fn(),
  };

  let EsKpiNetwork: ElasticsearchKpiNetworkAdapter;

  describe('getKpiNetwork - call stack', () => {
    beforeAll(async () => {
      (buildNetworkEventsQuery as jest.Mock).mockReset();
      (buildNetworkEventsQuery as jest.Mock).mockReturnValue(mockNetworkEventsQueryDsl);
      (buildUniqueFlowIdsQuery as jest.Mock).mockReset();
      (buildUniqueFlowIdsQuery as jest.Mock).mockReturnValue(mockUniqueFlowIdsQueryDsl);
      (buildDnsQuery as jest.Mock).mockReset();
      (buildDnsQuery as jest.Mock).mockReturnValue(mockDnsQueryDsl);
      (buildUniquePrvateIpQuery as jest.Mock).mockReset();
      (buildUniquePrvateIpQuery as jest.Mock).mockReturnValue(mockUniquePrvateIpsQueryDsl);
      (buildTlsHandshakeQuery as jest.Mock).mockReset();
      (buildTlsHandshakeQuery as jest.Mock).mockReturnValue(mockTlsHandshakesQueryDsl);

      mockCallWithRequest.mockResolvedValue(mockResponse);
      jest.doMock('../framework', () => ({
        callWithRequest: mockCallWithRequest,
      }));
      EsKpiNetwork = new ElasticsearchKpiNetworkAdapter(mockFramework);
      data = await EsKpiNetwork.getKpiNetwork(mockRequest as FrameworkRequest, mockOptions);
    });

    afterAll(() => {
      mockCallWithRequest.mockReset();
      (buildNetworkEventsQuery as jest.Mock).mockClear();
      (buildUniqueFlowIdsQuery as jest.Mock).mockClear();
      (buildDnsQuery as jest.Mock).mockClear();
      (buildUniquePrvateIpQuery as jest.Mock).mockClear();
      (buildTlsHandshakeQuery as jest.Mock).mockClear();
    });

    test('should build query for network events with correct option', () => {
      expect(buildNetworkEventsQuery).toHaveBeenCalledWith(mockOptions);
    });

    test('should build query for unique flow IDs with correct option', () => {
      expect(buildUniqueFlowIdsQuery).toHaveBeenCalledWith(mockOptions);
    });

    test('should build query for unique private ip with correct option', () => {
      expect(buildUniquePrvateIpQuery).toHaveBeenCalledWith(mockOptions);
    });

    test('should build query for dns with correct option', () => {
      expect(buildDnsQuery).toHaveBeenCalledWith(mockOptions);
    });

    test('should build query for tls handshakes with correct option', () => {
      expect(buildTlsHandshakeQuery).toHaveBeenCalledWith(mockOptions);
    });

    test('should send msearch request', () => {
      expect(mockCallWithRequest).toHaveBeenCalledWith(mockRequest, 'msearch', mockMsearchOptions);
    });

    test('Happy Path - get Data', () => {
      expect(data).toEqual(mockResult);
    });
  });

  describe('Unhappy Path - No data', () => {
    beforeAll(async () => {
      mockCallWithRequest.mockResolvedValue(mockResponseNoData);
      (buildNetworkEventsQuery as jest.Mock).mockClear();
      (buildUniqueFlowIdsQuery as jest.Mock).mockClear();
      (buildDnsQuery as jest.Mock).mockClear();
      (buildUniquePrvateIpQuery as jest.Mock).mockClear();
      (buildTlsHandshakeQuery as jest.Mock).mockClear();

      jest.doMock('../framework', () => ({
        callWithRequest: mockCallWithRequest,
      }));

      EsKpiNetwork = new ElasticsearchKpiNetworkAdapter(mockFramework);
      data = await EsKpiNetwork.getKpiNetwork(mockRequest as FrameworkRequest, mockOptions);
    });

    afterAll(() => {
      mockCallWithRequest.mockReset();
      (buildNetworkEventsQuery as jest.Mock).mockClear();
      (buildUniqueFlowIdsQuery as jest.Mock).mockClear();
      (buildDnsQuery as jest.Mock).mockClear();
      (buildUniquePrvateIpQuery as jest.Mock).mockClear();
      (buildTlsHandshakeQuery as jest.Mock).mockClear();
    });

    test('getKpiNetwork - response without data', async () => {
      expect(data).toEqual(mockResultNoData);
    });
  });
});
