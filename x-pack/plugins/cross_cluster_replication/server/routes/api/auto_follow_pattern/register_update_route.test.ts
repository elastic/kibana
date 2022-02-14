/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock, httpServerMock } from 'src/core/server/mocks';
import { kibanaResponseFactory, RequestHandler } from 'src/core/server';

import { handleEsError } from '../../../shared_imports';
import { mockRouteContext, mockLicense } from '../test_lib';
import { registerUpdateRoute } from './register_update_route';

const httpService = httpServiceMock.createSetupContract();

describe('[CCR API] Update auto-follow pattern', () => {
  let routeHandler: RequestHandler<any, any, any>;

  beforeEach(() => {
    const router = httpService.createRouter();

    registerUpdateRoute({
      router,
      license: mockLicense,
      lib: {
        handleEsError,
      },
    });

    routeHandler = router.put.mock.calls[0][1];
  });

  it('should serialize the payload before sending it to Elasticsearch', async () => {
    const routeContextMock = mockRouteContext({
      ccr: {
        // Just echo back what we send so we can inspect it.
        putAutoFollowPattern: jest.fn().mockImplementation((payload) => payload),
      },
    });

    const request = httpServerMock.createKibanaRequest({
      params: { id: 'foo' },
      body: {
        remoteCluster: 'bar1',
        leaderIndexPatterns: ['bar2'],
        followIndexPattern: 'bar3',
      },
    });

    const response = await routeHandler(routeContextMock, request, kibanaResponseFactory);

    expect(response.payload).toEqual({
      name: 'foo',
      body: {
        remote_cluster: 'bar1',
        leader_index_patterns: ['bar2'],
        follow_index_pattern: 'bar3',
      },
    });
  });
});
