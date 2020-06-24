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
import { registerGetRoute } from './register_get_route';

const httpService = httpServiceMock.createSetupContract();

describe('[CCR API] Get one auto-follow pattern', () => {
  let routeHandler: RequestHandler<any, any, any>;

  beforeEach(() => {
    const router = httpService.createRouter();

    registerGetRoute({
      router,
      license: {
        guardApiRoute: (route: any) => route,
      } as License,
      lib: {
        isEsError,
        formatEsError,
      },
    });

    routeHandler = router.get.mock.calls[0][1];
  });

  it('should return a single resource even though ES returns an array with 1 item', async () => {
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
      callAsCurrentUser: jest.fn().mockResolvedValueOnce(ccrAutoFollowPatternResponseMock),
    });

    const request = httpServerMock.createKibanaRequest();
    const response = await routeHandler(routeContextMock, request, kibanaResponseFactory);
    expect(response.payload).toEqual({
      active: true,
      followIndexPattern: 'follow',
      leaderIndexPatterns: ['leader*'],
      name: 'autoFollowPattern',
      remoteCluster: 'remoteCluster',
    });
  });
});
