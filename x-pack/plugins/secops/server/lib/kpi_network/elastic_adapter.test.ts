/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash/fp';

import { KpiNetworkData } from '../../graphql/types';
import { FrameworkAdapter, FrameworkRequest } from '../framework';

import { ElasticsearchKpiNetworkAdapter } from './elasticsearch_adapter';
import { mockOptions, mockRequest, mockResponse, mockResult } from './mock';

describe('Network Kpi elasticsearch_adapter', () => {
  describe('Happy Path - get Data', () => {
    const mockCallWithRequest = jest.fn();
    mockCallWithRequest.mockResolvedValue(mockResponse);
    const mockFramework: FrameworkAdapter = {
      version: 'mock',
      callWithRequest: mockCallWithRequest,
      exposeStaticDir: jest.fn(),
      registerGraphQLEndpoint: jest.fn(),
      getIndexPatternsService: jest.fn(),
    };
    jest.mock('../framework', () => ({
      callWithRequest: mockCallWithRequest,
    }));

    test('getKpiNetwork', async () => {
      const EsKpiNetwork = new ElasticsearchKpiNetworkAdapter(mockFramework);
      const data: KpiNetworkData = await EsKpiNetwork.getKpiNetwork(
        mockRequest as FrameworkRequest,
        mockOptions
      );
      expect(data).toEqual(mockResult);
    });
  });

  describe('Unhappy Path - No data', () => {
    const mockNoDataResponse = cloneDeep(mockResponse);
    mockNoDataResponse.hits.total.value = 0;
    mockNoDataResponse.aggregations.unique_flow_id.value = 0;
    mockNoDataResponse.aggregations.active_agents.value = 0;
    const mockCallWithRequest = jest.fn();
    mockCallWithRequest.mockResolvedValue(mockNoDataResponse);
    const mockFramework: FrameworkAdapter = {
      version: 'mock',
      callWithRequest: mockCallWithRequest,
      exposeStaticDir: jest.fn(),
      registerGraphQLEndpoint: jest.fn(),
      getIndexPatternsService: jest.fn(),
    };
    jest.mock('../framework', () => ({
      callWithRequest: mockCallWithRequest,
    }));

    test('getKpiNetwork', async () => {
      const EsKpiNetwork = new ElasticsearchKpiNetworkAdapter(mockFramework);
      const data: KpiNetworkData = await EsKpiNetwork.getKpiNetwork(
        mockRequest as FrameworkRequest,
        mockOptions
      );
      expect(data).toEqual({
        networkEvents: 0,
        uniqueFlowId: 0,
        activeAgents: 0,
      });
    });
  });
});
