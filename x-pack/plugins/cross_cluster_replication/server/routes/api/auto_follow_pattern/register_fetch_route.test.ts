/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import { kibanaResponseFactory, RequestHandler } from '@kbn/core/server';

import { handleEsError } from '../../../shared_imports';
import { mockRouteContext, mockLicense } from '../test_lib';
import { registerFetchRoute } from './register_fetch_route';

const httpService = httpServiceMock.createSetupContract();

describe('[CCR API] Fetch all auto-follow patterns', () => {
  let routeHandler: RequestHandler<any, any, any>;

  beforeEach(() => {
    const router = httpService.createRouter();

    registerFetchRoute({
      router,
      license: mockLicense,
      lib: {
        handleEsError,
      },
    });

    routeHandler = router.get.mock.calls[0][1];
  });

  it('deserializes the response from Elasticsearch', async () => {
    const ccrAutoFollowPatternResponseMock = {
      patterns: [
        {
          name: 'autoFollowPattern',
          pattern: {
            active: true,
            remote_cluster: 'remoteCluster',
            leader_index_patterns: ['leader*'],
            follow_index_pattern: 'follow',
          },
        },
      ],
    };

    const routeContextMock = mockRouteContext({
      ccr: {
        getAutoFollowPattern: jest.fn().mockResolvedValueOnce(ccrAutoFollowPatternResponseMock),
      },
    });

    const request = httpServerMock.createKibanaRequest();
    const response = await routeHandler(routeContextMock, request, kibanaResponseFactory);
    expect(response.payload.patterns).toEqual([
      {
        active: true,
        followIndexPattern: 'follow',
        leaderIndexPatterns: ['leader*'],
        name: 'autoFollowPattern',
        remoteCluster: 'remoteCluster',
      },
    ]);
  });
});
