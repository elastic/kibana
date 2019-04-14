/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash/fp';

import { NetworkTopNFlowData } from '../../graphql/types';
import { FrameworkAdapter, FrameworkRequest } from '../framework';

import { ElasticsearchNetworkAdapter } from './elasticsearch_adapter';
import { mockOptions, mockRequest, mockResponse, mockResult } from './mock';

describe('Network Top N flow elasticsearch_adapter with FlowTarget=source and FlowDirection=uniDirectional', () => {
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
    jest.doMock('../framework', () => ({
      callWithRequest: mockCallWithRequest,
    }));

    test('getNetworkTopNFlow', async () => {
      const EsNetworkTopNFlow = new ElasticsearchNetworkAdapter(mockFramework);
      const data: NetworkTopNFlowData = await EsNetworkTopNFlow.getNetworkTopNFlow(
        mockRequest as FrameworkRequest,
        mockOptions
      );
      expect(data).toEqual(mockResult);
    });
  });

  describe('Unhappy Path - No data', () => {
    const mockNoDataResponse = cloneDeep(mockResponse);
    mockNoDataResponse.aggregations.top_n_flow_count.value = 0;
    mockNoDataResponse.aggregations.top_uni_flow.buckets = [];
    const mockCallWithRequest = jest.fn();
    mockCallWithRequest.mockResolvedValue(mockNoDataResponse);
    const mockFramework: FrameworkAdapter = {
      version: 'mock',
      callWithRequest: mockCallWithRequest,
      exposeStaticDir: jest.fn(),
      registerGraphQLEndpoint: jest.fn(),
      getIndexPatternsService: jest.fn(),
    };
    jest.doMock('../framework', () => ({
      callWithRequest: mockCallWithRequest,
    }));

    test('getNetworkTopNFlow', async () => {
      const EsNetworkTopNFlow = new ElasticsearchNetworkAdapter(mockFramework);
      const data: NetworkTopNFlowData = await EsNetworkTopNFlow.getNetworkTopNFlow(
        mockRequest as FrameworkRequest,
        mockOptions
      );
      expect(data).toEqual({
        edges: [],
        pageInfo: { endCursor: { tiebreaker: null, value: '10' }, hasNextPage: false },
        totalCount: 0,
      });
    });
  });

  describe('No pagination', () => {
    const mockNoPaginationResponse = cloneDeep(mockResponse);
    mockNoPaginationResponse.aggregations.top_n_flow_count.value = 10;
    mockNoPaginationResponse.aggregations.top_uni_flow.buckets = mockNoPaginationResponse.aggregations.top_uni_flow.buckets.slice(
      0,
      -1
    );
    const mockCallWithRequest = jest.fn();
    mockCallWithRequest.mockResolvedValue(mockNoPaginationResponse);
    const mockFramework: FrameworkAdapter = {
      version: 'mock',
      callWithRequest: mockCallWithRequest,
      exposeStaticDir: jest.fn(),
      registerGraphQLEndpoint: jest.fn(),
      getIndexPatternsService: jest.fn(),
    };
    jest.doMock('../framework', () => ({
      callWithRequest: mockCallWithRequest,
    }));

    test('getNetworkTopNFlow', async () => {
      const EsNetworkTopNFlow = new ElasticsearchNetworkAdapter(mockFramework);
      const data: NetworkTopNFlowData = await EsNetworkTopNFlow.getNetworkTopNFlow(
        mockRequest as FrameworkRequest,
        mockOptions
      );
      expect(data.pageInfo.hasNextPage).toBeFalsy();
    });
  });
});
