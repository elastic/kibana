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
} from '../../../../../../src/core/server/mocks';
import { EventsForProcessResponse, LegacyEndpointEvent } from '../../../common/types';
import { registerResolverRoutes } from '../resolver';
import { EndpointConfigSchema } from '../../config';
import { SearchResponse } from 'elasticsearch';

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

function createLegacyEvents(count: number, category: string, eventType: string) {
  const events: any[] = [];
  for (let i = 0; i < count; i++) {
    events.push({
      _index: 'index',
      _type: 'type',
      _id: 'id',
      _score: 1,
      _source: {
        endgame: {
          event_type_full: category,
          event_subtype_full: eventType,
          unique_pid: getRandomInt(10000),
          unique_ppid: getRandomInt(10000),
        },
        agent: {
          id: 'awesome-id',
        },
      },
    });
  }
  return {
    took: 1,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      failed: 0,
      skipped: 0,
    },
    hits: {
      max_score: 0,
      hits: events,
    },
  };
}

function createEvents(count: number, category: string, eventType: string) {
  const events: any[] = [];
  for (let i = 0; i < count; i++) {
    events.push({
      _index: 'index',
      _type: 'type',
      _id: 'id',
      _score: 1,
      _source: {
        event: {
          category,
          type: eventType,
        },
        endpoint: {
          process: {
            entity_id: getRandomInt(10000),
            parent: {
              entity_id: getRandomInt(10000),
            },
          },
        },
        agent: {
          id: 'awesome-id',
        },
      },
    });
  }
  return {
    took: 1,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      failed: 0,
      skipped: 0,
    },
    hits: {
      max_score: 0,
      hits: events,
    },
  };
}

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
    const legacyEntityID = 'endgame-5-awesome-id';
    const mockRequest = httpServerMock.createKibanaRequest({
      path: `/api/endpoint/resolver/${legacyEntityID}`,
    });

    const lifecycleResponse = createLegacyEvents(5, 'process_event', 'still_running');
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
