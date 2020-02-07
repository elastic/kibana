/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  IClusterClient,
  IRouter,
  IScopedClusterClient,
  KibanaResponseFactory,
  RequestHandler,
  RequestHandlerContext,
} from 'kibana/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  httpServiceMock,
  loggingServiceMock,
} from '../../../../../src/core/server/mocks';
import { ResolverResponse } from '../../common/types';
import { registerResolverRoutes } from './resolver';
import { EndpointConfigSchema } from '../config';
import { buildLegacyEntityID } from '../services/resolver/common';

describe('test resolver route', () => {
  let routerMock: jest.Mocked<IRouter>;
  let mockResponse: jest.Mocked<KibanaResponseFactory>;
  let mockClusterClient: jest.Mocked<IClusterClient>;
  let mockScopedClient: jest.Mocked<IScopedClusterClient>;
  let routeHandler: RequestHandler<any, any, any>;

  beforeEach(() => {
    mockClusterClient = elasticsearchServiceMock.createClusterClient();
    mockScopedClient = elasticsearchServiceMock.createScopedClusterClient();
    mockClusterClient.asScoped.mockReturnValue(mockScopedClient);
    routerMock = httpServiceMock.createRouter();
    mockResponse = httpServerMock.createResponseFactory();
    registerResolverRoutes(routerMock, {
      logFactory: loggingServiceMock.create(),
      config: () => Promise.resolve(EndpointConfigSchema.validate({})),
    });
  });

  it('should get the right count query information', async () => {
    const endpointID = 'awesome-id';
    const uniquePID = 5;
    const legacyEntityID = buildLegacyEntityID(endpointID, uniquePID);
    const mockRequest = httpServerMock.createKibanaRequest({
      path: '/api/endpoint/resolver/node',
      query: {
        page_size: 3,
        page_index: 2,
        entity_id: legacyEntityID,
      },
    });
    const expTotal = 10;
    const countResponse = {
      count: expTotal,
      _shards: {
        total: 1,
        successful: 1,
        failed: 0,
        skipped: 0,
      },
    };

    const searchResponse = {
      took: 1,
      timed_out: false,
      _shards: {
        total: 1,
        successful: 1,
        failed: 0,
        skipped: 0,
      },
      hits: {
        total: {
          value: 1,
          relation: 'gte',
        },
        max_score: 0,
        hits: [
          {
            _index: 'index',
            _type: 'type',
            _id: 'id',
            _score: 1,
            _source: {
              endgame: {
                event_type_full: 'process_event',
                event_subtype_full: 'creation_event',
                unique_pid: uniquePID,
                unique_ppid: 1,
              },
              agent: {
                id: endpointID,
              },
            },
          },
        ],
      },
    };
    // return the search information first and then the count information
    mockScopedClient.callAsCurrentUser
      .mockImplementationOnce(() => Promise.resolve(searchResponse))
      .mockImplementationOnce(() => Promise.resolve(countResponse));

    routeHandler = routerMock.get.mock.calls.find(
      ([{ path }]) => path.startsWith('/api/endpoint/resolver/node')
      // return second item of the tuple here because I don't need the routeConfig field
      // trailing ! is because the ts linter complains that the object is possible undefined and it forces
      // the linter to ignore that https://stackoverflow.com/questions/42273853/in-typescript-what-is-the-exclamation-mark-bang-operator-when-dereferenci
    )![1];

    await routeHandler(
      ({
        core: {
          elasticsearch: {
            dataClient: mockScopedClient,
          },
        },
      } as unknown) as RequestHandlerContext,
      mockRequest,
      mockResponse
    );
    expect(mockScopedClient.callAsCurrentUser).toBeCalled();
    // first call is the search
    const resolverResponse = mockResponse.ok.mock.calls[0][0]?.body as ResolverResponse;
    expect(resolverResponse.total).toEqual(expTotal);
    // second call is the count
    const countCall = mockScopedClient.callAsCurrentUser.mock.calls[1];
    expect(countCall[0]).toBe('count');
    expect(countCall[1]).toHaveProperty('bool');
    expect(countCall[1]).not.toHaveProperty('body');
  });
});
