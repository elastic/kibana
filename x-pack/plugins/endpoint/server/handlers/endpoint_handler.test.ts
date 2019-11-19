/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import singleEndpointData from './../fixtures/mapper_test/single_endpoint_data.json';
import allEndpointData from './../fixtures/mapper_test/all_endpoints_data.json';
import { IClusterClient, IScopedClusterClient } from 'kibana/server';
import { EndpointHandler } from './endpoint_handler';
import { SearchResponse } from 'elasticsearch';
import { EndpointData } from '../types';
import { elasticsearchServiceMock } from '../../../../../src/core/server/mocks';

describe('Test Endpoint Handler', () => {
  let mockClusterClient: jest.Mocked<IClusterClient>;
  let mockScopedClient: jest.Moked<IScopedClusterClient>;
  beforeEach(() => {
    mockClusterClient = elasticsearchServiceMock.createClusterClient() as jest.Mocked<
      IClusterClient
    >;
    mockScopedClient = elasticsearchServiceMock.createScopedClusterClient();
    mockClusterClient.asScoped.mockReturnValue(mockScopedClient);
  });
  describe('findEndpoint()', () => {
    it('test find endpoint', async () => {
      mockScopedClient.callAsCurrentUser = jest.fn(
        () => singleEndpointData as SearchResponse<EndpointData>
      );
      const testHandler = new EndpointHandler(mockClusterClient);
      const result = await testHandler.findEndpoint('endpoint-id');
      expect(mockScopedClient.callAsCurrentUser).toBeCalledWith('search', {
        body: {
          query: {
            match: {
              machine_id: 'endpoint-id',
            },
          },
          sort: [
            {
              created_at: {
                order: 'desc',
              },
            },
          ],
          size: 1,
        },
        index: 'endpoint*',
      });
      expect(result).toHaveLength(1);
      expect(result[0].machine_id).toEqual('9b28b63f-68d8-44ee-b8c0-49ba057a53ec');
    });
  });

  describe('findLatestOfAllEndpoints()', () => {
    it('test find the latest of all endpoints', async () => {
      mockScopedClient.callAsCurrentUser = jest.fn(
        () => allEndpointData as SearchResponse<EndpointData>
      );
      const testHandler = new EndpointHandler(mockClusterClient);
      const result = await testHandler.findLatestOfAllEndpoints();
      expect(mockScopedClient.callAsCurrentUser).toBeCalledWith('search', {
        body: {
          query: {
            match_all: {},
          },
          collapse: {
            field: 'machine_id',
            inner_hits: {
              name: 'most_recent',
              size: 1,
              sort: [{ created_at: 'desc' }],
            },
          },
        },
        index: 'endpoint*',
      });
      expect(result).toHaveLength(3);
      const actualMachineIds = new Set(result.map(endpointData => endpointData.machine_id));
      const expectedMachineIds = new Set([
        '3f148a0b-a33e-44f2-8834-9ebc1c073507',
        'c14a0771-7157-4f79-ac9e-013e6e9d1458',
        'be3b5b7c-e270-418f-90dd-ec51887c16ff',
      ]);
      expect(actualMachineIds).toEqual(expectedMachineIds);
    });
  });
});
