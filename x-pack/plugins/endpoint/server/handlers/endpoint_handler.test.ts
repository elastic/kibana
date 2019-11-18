/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import singleEndpointData from './../fixtures/mapper_test/single_endpoint_data.json';
import { IClusterClient } from 'kibana/server';
import { EndpointHandler } from './endpoint_handler';
import { SearchResponse } from 'elasticsearch';
import { EndpointData } from '../types';
import { elasticsearchServiceMock } from '../../../../../src/core/server/mocks';

describe('Test Endpoint Handler', () => {
  let mockClusterClient: jest.Mocked<IClusterClient>;
  let mockClient: jest.Mocked<IClusterClient>;
  beforeEach(() => {
    mockClusterClient = elasticsearchServiceMock.createClusterClient() as jest.Mocked<
      IClusterClient
    >;
    mockClient = (mockClusterClient as unknown) as jest.Mocked<IClusterClient>;
  });
  describe('findEndpoint()', () => {
    it('test find endpoint', async () => {
      const mockContext = {
        core: {
          elasticsearch: {
            adminClient: mockClient,
          },
        },
      };
      mockClient.callAsInternalUser = jest.fn(
        () => singleEndpointData as SearchResponse<EndpointData>
      );
      const testHandler = new EndpointHandler(mockContext);
      const result = await testHandler.findEndpoint('endpoint-id');
      expect(mockClient.callAsInternalUser).toBeCalledWith('search', {
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
});
