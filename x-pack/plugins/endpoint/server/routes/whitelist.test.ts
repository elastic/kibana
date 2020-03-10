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
  RouteConfig,
} from 'kibana/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  httpServiceMock,
  loggingServiceMock,
} from '../../../../../src/core/server/mocks';
import { WhitelistRule, WhitelistSet } from '../../common/types';
import { SearchResponse } from 'elasticsearch';
import { registerWhitelistRoutes } from './whitelist';
import { EndpointConfigSchema } from '../config';
import * as data from '../test_data/all_whitelist_data.json';

// A fake elasticsearch error message
const mockElasticSearchError = 'This is some error that you would expect from elasticsearch';

describe('test whitelist route', () => {
  let routerMock: jest.Mocked<IRouter>;
  let mockResponse: jest.Mocked<KibanaResponseFactory>;
  let mockClusterClient: jest.Mocked<IClusterClient>;
  let mockScopedClient: jest.Mocked<IScopedClusterClient>;
  let routeHandler: RequestHandler<any, any, any>;
  let routeConfig: RouteConfig<any, any, any, any>;

  beforeEach(() => {
    mockClusterClient = elasticsearchServiceMock.createClusterClient();
    mockScopedClient = elasticsearchServiceMock.createScopedClusterClient();
    mockClusterClient.asScoped.mockReturnValue(mockScopedClient);
    routerMock = httpServiceMock.createRouter();
    mockResponse = httpServerMock.createResponseFactory();
    registerWhitelistRoutes(routerMock, {
      logFactory: loggingServiceMock.create(),
      config: () => Promise.resolve(EndpointConfigSchema.validate({})),
    });
  });

  it('should create a whitelist rule from a POST request', async () => {
    const expectedComment = 'Hi this is a comment on a whitelist rule';
    const expectedPath = '/some/path/to/a/file';
    const mockRequest = httpServerMock.createKibanaRequest({
      path: '/api/endpoint/whitelist',
      body: {
        alert_id: '1234',
        comment: expectedComment,
        file_path: expectedPath,
      },
      method: 'post',
    });

    const response = { errors: null };
    mockScopedClient.callAsCurrentUser.mockImplementationOnce(() => Promise.resolve(response));
    [routeConfig, routeHandler] = routerMock.post.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/whitelist')
    )!;

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

    // Expect that the ES client calls the `bulk` API
    expect(mockScopedClient.callAsCurrentUser).toBeCalled();
    expect(mockScopedClient.callAsCurrentUser.mock.calls[0][0]).toEqual('bulk');

    // Expect that this route requires authentication
    expect(routeConfig.options).toEqual({ authRequired: true });
    expect(mockResponse.ok).toBeCalled();
    const resp = mockResponse.ok.mock.calls[0][0]?.body as WhitelistSet;

    // Excpect that one rule was created and that it is well formed
    expect(resp.length).toEqual(1);
    const rule: WhitelistRule = resp[0];
    expect(rule.comment).toEqual(expectedComment);
    expect(rule.whitelistRule.value).toEqual(expectedPath);
    expect(rule.whitelistRule.applyTo).toEqual('malware.file.path');
  });

  it('should handle elasticsearch failing while creating a whitelist rule', async () => {
    const expectedComment = 'Hi this is a comment on a whitelist rule';
    const expectedPath = '/some/path/to/a/file';
    const mockRequest = httpServerMock.createKibanaRequest({
      path: '/api/endpoint/whitelist',
      body: {
        alert_id: '1234',
        comment: expectedComment,
        file_path: expectedPath,
      },
      method: 'post',
    });

    // The elasticsearch call will reject
    mockScopedClient.callAsCurrentUser.mockImplementationOnce(() =>
      Promise.reject({ errors: mockElasticSearchError })
    );
    [routeConfig, routeHandler] = routerMock.post.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/whitelist')
    )!;

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

    // Expect that the ES client calls the `bulk` API
    expect(mockScopedClient.callAsCurrentUser).toBeCalled();
    expect(mockScopedClient.callAsCurrentUser.mock.calls[0][0]).toEqual('bulk');

    // Expect that this route requires authentication
    expect(routeConfig.options).toEqual({ authRequired: true });

    // Expect a 500 response with an error message
    expect(mockResponse.internalError).toBeCalled();
    expect(mockResponse.internalError.mock.calls[0][0].body.errors).toEqual(mockElasticSearchError);
  });

  it('should create multiple whitelist rules from a POST request', async () => {
    const expectedComment = 'Hi this is a comment on a whitelist rule';
    const expectedPath = '/some/path/to/a/file';
    const mockRequest = httpServerMock.createKibanaRequest({
      path: '/api/endpoint/whitelist',
      body: {
        alert_id: '1234',
        sha256: '43958234958234952345',
        signer: 'Microsoft',
        comment: expectedComment,
        file_path: expectedPath,
      },
      method: 'post',
    });

    mockScopedClient.callAsCurrentUser.mockImplementationOnce(() =>
      Promise.resolve({ errors: null })
    );
    [routeConfig, routeHandler] = routerMock.post.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/whitelist')
    )!;

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

    // Expect that the ES client calls the `bulk` API
    expect(mockScopedClient.callAsCurrentUser).toBeCalled();
    expect(mockScopedClient.callAsCurrentUser.mock.calls[0][0]).toEqual('bulk');

    // Expect that this route requires authentication
    expect(routeConfig.options).toEqual({ authRequired: true });

    // Expect that the response is well forms with the right number of rules
    expect(mockResponse.ok).toBeCalled();
    const resp = mockResponse.ok.mock.calls[0][0]?.body as WhitelistRule;
    expect(resp.length).toEqual(3);
  });

  it('should not create whitelist rules if the given fields are not supported', async () => {
    const expectedComment = 'Hi this is a comment on a whitelist rule';
    const mockRequest = httpServerMock.createKibanaRequest({
      path: '/api/endpoint/whitelist',
      body: {
        alert_id: '1234',
        madeupfield: 'blahblah',
        singer: 'no one',
        comment: expectedComment,
        path: 'somewhere',
      },
      method: 'post',
    });

    mockScopedClient.callAsCurrentUser.mockImplementationOnce(() =>
      Promise.resolve({ errors: null })
    );
    [routeConfig, routeHandler] = routerMock.post.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/whitelist')
    )!;

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

    // Expect that the ES client does not call the `bulk` API
    expect(mockScopedClient.callAsCurrentUser).not.toBeCalled();

    // Expect that this route requires authentication
    expect(routeConfig.options).toEqual({ authRequired: true });

    // Expect a bad request with an error message
    expect(mockResponse.badRequest).toBeCalled();
    expect(mockResponse.badRequest.mock.calls[0][0].error).not.toBeNull();
  });

  it('should list created whitelist entries from a GET request', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({
      path: '/api/endpoint/whitelist',
      method: 'get',
    });

    const response: SearchResponse<WhitelistRule> = (data as unknown) as SearchResponse<
      WhitelistRule
    >;
    mockScopedClient.callAsCurrentUser.mockImplementationOnce(() => Promise.resolve(response));
    [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/whitelist')
    )!;

    // TODO mock other ES calls

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

    // Both rules from the fixture in `all_whitelist_data.json` should be returned properly
    expect(mockResponse.ok.mock.calls[0][0].body.length).toEqual(2);
  });

  it('should handle elasticsearch failing while trying to list whitelist entries', async () => {
    const mockRequest = httpServerMock.createKibanaRequest({
      path: '/api/endpoint/whitelist',
      method: 'get',
    });

    mockScopedClient.callAsCurrentUser.mockImplementationOnce(() =>
      Promise.reject({ errors: mockElasticSearchError })
    );
    [routeConfig, routeHandler] = routerMock.get.mock.calls.find(([{ path }]) =>
      path.startsWith('/api/endpoint/whitelist')
    )!;

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

    // Expect a 500 response with an error message
    expect(mockResponse.internalError.mock.calls[0][0].body.errors).toEqual(mockElasticSearchError);
  });
});
