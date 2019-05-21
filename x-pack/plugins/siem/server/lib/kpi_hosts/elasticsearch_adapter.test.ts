/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KpiHostsData } from '../../graphql/types';
import { FrameworkAdapter, FrameworkRequest } from '../framework';

import { ElasticsearchKpiHostsAdapter } from './elasticsearch_adapter';
import {
  mockAuthQuery,
  mockGeneralQuery,
  mockMsearchOptions,
  mockOptions,
  mockRequest,
  mockResponse,
  mockResult,
} from './mock';
import * as authQueryDsl from './query_authentication.dsl';
import * as generalQueryDsl from './query_general.dsl';

describe('Hosts Kpi elasticsearch_adapter', () => {
  const mockCallWithRequest = jest.fn();
  const mockFramework: FrameworkAdapter = {
    version: 'mock',
    callWithRequest: mockCallWithRequest,
    exposeStaticDir: jest.fn(),
    registerGraphQLEndpoint: jest.fn(),
    getIndexPatternsService: jest.fn(),
  };
  let mockBuildQuery: jest.SpyInstance;
  let mockBuildAuthQuery: jest.SpyInstance;
  let EsKpiHosts: ElasticsearchKpiHostsAdapter;
  let data: KpiHostsData;

  describe('getKpiHosts - call stack', () => {
    beforeAll(async () => {
      mockCallWithRequest.mockResolvedValue(mockResponse);
      jest.doMock('../framework', () => ({
        callWithRequest: mockCallWithRequest,
      }));
      mockBuildQuery = jest
        .spyOn(generalQueryDsl, 'buildGeneralQuery')
        .mockReturnValue(mockGeneralQuery);
      mockBuildAuthQuery = jest
        .spyOn(authQueryDsl, 'buildAuthQuery')
        .mockReturnValue(mockAuthQuery);

      EsKpiHosts = new ElasticsearchKpiHostsAdapter(mockFramework);
      data = await EsKpiHosts.getKpiHosts(mockRequest as FrameworkRequest, mockOptions);
    });

    afterAll(() => {
      mockCallWithRequest.mockReset();
      mockBuildQuery.mockRestore();
      mockBuildAuthQuery.mockRestore();
    });

    test('should build general query with correct option', () => {
      expect(mockBuildQuery).toHaveBeenCalledWith(mockOptions);
    });

    test('should build auth query with correct option', () => {
      expect(mockBuildAuthQuery).toHaveBeenCalledWith(mockOptions);
    });

    test('should send msearch request', () => {
      expect(mockCallWithRequest).toHaveBeenCalledWith(mockRequest, 'msearch', mockMsearchOptions);
    });
  });

  describe('Happy Path - get Data', () => {
    beforeAll(async () => {
      mockCallWithRequest.mockResolvedValue(mockResponse);
      jest.doMock('../framework', () => ({
        callWithRequest: mockCallWithRequest,
      }));
      EsKpiHosts = new ElasticsearchKpiHostsAdapter(mockFramework);
      data = await EsKpiHosts.getKpiHosts(mockRequest as FrameworkRequest, mockOptions);
    });

    afterAll(() => {
      mockCallWithRequest.mockReset();
    });

    test('getKpiHosts - response with data', () => {
      expect(data).toEqual(mockResult);
    });
  });

  describe('Unhappy Path - No data', () => {
    beforeAll(async () => {
      mockCallWithRequest.mockResolvedValue(null);
      jest.doMock('../framework', () => ({
        callWithRequest: mockCallWithRequest,
      }));
      EsKpiHosts = new ElasticsearchKpiHostsAdapter(mockFramework);
      data = await EsKpiHosts.getKpiHosts(mockRequest as FrameworkRequest, mockOptions);
    });

    afterAll(() => {
      mockCallWithRequest.mockReset();
    });

    test('getKpiHosts - response without data', async () => {
      expect(data).toEqual({
        hosts: null,
        hostsHistogram: null,
        authSuccess: null,
        authSuccessHistogram: null,
        authFailure: null,
        authFailureHistogram: null,
        uniqueSourceIps: null,
        uniqueSourceIpsHistogram: null,
        uniqueDestinationIps: null,
        uniqueDestinationIpsHistogram: null,
      });
    });
  });
});
