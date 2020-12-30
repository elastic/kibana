/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { httpServiceMock, httpServerMock } from 'src/core/server/mocks';
import { kibanaResponseFactory, RequestHandler } from 'src/core/server';

import { isEsError } from '../../../shared_imports';
import { formatEsError } from '../../../lib/format_es_error';
import { License } from '../../../services';
import { mockRouteContext } from '../test_lib';
import { registerUpdateRoute } from './register_update_route';

const httpService = httpServiceMock.createSetupContract();

describe('[CCR API] Update auto-follow pattern', () => {
  let routeHandler: RequestHandler<any, any, any>;

  beforeEach(() => {
    const router = httpService.createRouter();

    registerUpdateRoute({
      router,
      license: {
        guardApiRoute: (route: any) => route,
      } as License,
      lib: {
        isEsError,
        formatEsError,
      },
    });

    routeHandler = router.put.mock.calls[0][1];
  });

  it('should serialize the payload before sending it to Elasticsearch', async () => {
    const routeContextMock = mockRouteContext({
      // Just echo back what we send so we can inspect it.
      callAsCurrentUser: jest.fn().mockImplementation((endpoint, payload) => payload),
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
      id: 'foo',
      body: {
        remote_cluster: 'bar1',
        leader_index_patterns: ['bar2'],
        follow_index_pattern: 'bar3',
      },
    });
  });
});
