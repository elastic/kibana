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
import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingServiceMock,
} from '../../../../../src/core/server/mocks';
import { ResponseToEndpointMapper } from './response_to_endpoint_mapper';
import { EndpointConfigSchema } from '../config';

describe('test endpoint handler', () => {
  let mockClusterClient: jest.Mocked<IClusterClient>;
  let mockScopedClient: jest.Mocked<IScopedClusterClient>;
  const responseToEndpointMapper: ResponseToEndpointMapper = new ResponseToEndpointMapper();
  const singleEndpointResult = singleEndpointData as SearchResponse<EndpointData>;
  const multipleEndpointsResult = allEndpointData as SearchResponse<EndpointData>;
  beforeEach(() => {
    mockClusterClient = elasticsearchServiceMock.createClusterClient() as jest.Mocked<
      IClusterClient
    >;
    mockScopedClient = elasticsearchServiceMock.createScopedClusterClient();
    mockClusterClient.asScoped.mockReturnValue(mockScopedClient);
  });
  describe('findEndpoint()', () => {
    it('test find endpoint', async () => {
      mockScopedClient.callAsCurrentUser.mockImplementationOnce(() =>
        Promise.resolve(singleEndpointResult)
      );
      const testHandler = new EndpointHandler({
        clusterClient: mockClusterClient,
        logFactory: loggingServiceMock.create(),
        config: () => Promise.resolve(EndpointConfigSchema.validate({})),
      });
      const response = await testHandler.findEndpoint(
        'endpoint-id',
        httpServerMock.createKibanaRequest()
      );
      const result = responseToEndpointMapper.mapHits(response);
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
        index: 'endpoint-agent*',
      });
      expect(result).toHaveLength(1);
      expect(result[0].machine_id).toEqual('9b28b63f-68d8-44ee-b8c0-49ba057a53ec');
    });
  });

  describe('findLatestOfAllEndpoints()', () => {
    it('test find the latest of all endpoints', async () => {
      mockScopedClient.callAsCurrentUser.mockImplementationOnce(() =>
        Promise.resolve(multipleEndpointsResult)
      );

      const testHandler = new EndpointHandler({
        clusterClient: mockClusterClient,
        logFactory: loggingServiceMock.create(),
        config: () => Promise.resolve(EndpointConfigSchema.validate({})),
      });
      const response = await testHandler.findLatestOfAllEndpoints(
        httpServerMock.createKibanaRequest()
      );
      const result = responseToEndpointMapper.mapInnerHits(response);
      expect(mockScopedClient.callAsCurrentUser).toBeCalledWith('search', {
        from: 0,
        size: 10,
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
          aggs: {
            total: {
              cardinality: {
                field: 'machine_id',
              },
            },
          },
          sort: [
            {
              created_at: {
                order: 'desc',
              },
            },
          ],
        },
        index: 'endpoint-agent*',
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

    it('test find the latest of all endpoints with params', async () => {
      mockScopedClient.callAsCurrentUser.mockImplementationOnce(() =>
        Promise.resolve(multipleEndpointsResult)
      );
      const testHandler = new EndpointHandler({
        clusterClient: mockClusterClient,
        logFactory: loggingServiceMock.create(),
        config: () => Promise.resolve(EndpointConfigSchema.validate({})),
      });
      const response = await testHandler.findLatestOfAllEndpoints(
        httpServerMock.createKibanaRequest({
          query: {
            pageIndex: 1,
            pageSize: 2,
          },
        })
      );
      const result = responseToEndpointMapper.mapInnerHits(response);
      expect(mockScopedClient.callAsCurrentUser).toBeCalledWith('search', {
        from: 2,
        size: 2,
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
          aggs: {
            total: {
              cardinality: {
                field: 'machine_id',
              },
            },
          },
          sort: [
            {
              created_at: {
                order: 'desc',
              },
            },
          ],
        },
        index: 'endpoint-agent*',
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
