/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { httpServiceMock, httpServerMock } from 'src/core/server/mocks';
import {
  IRouter,
  kibanaResponseFactory,
  RequestHandler,
  RequestHandlerContext,
} from 'src/core/server';

import { isEsError } from '../../../lib/is_es_error';
import { License } from '../../../services';
import { registerGetRoute } from './register_get_route';

const httpService = httpServiceMock.createSetupContract();

describe('[CCR API] Get one auto-follow pattern', () => {
  let routeHandler: RequestHandler<any, any, any>;

  beforeEach(() => {
    const router = httpService.createRouter('') as jest.Mocked<IRouter>;

    registerGetRoute({
      router,
      license: {
        guardApiRoute: (route: any) => route,
      } as License,
      lib: {
        isEsError,
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

    const mockRouteContext = ({
      crossClusterReplication: {
        client: {
          callAsCurrentUser: jest.fn().mockResolvedValueOnce(ccrAutoFollowPatternResponseMock),
        },
      },
    } as unknown) as RequestHandlerContext;

    const request = httpServerMock.createKibanaRequest();
    const response = await routeHandler(mockRouteContext, request, kibanaResponseFactory);
    expect(response.payload).toEqual({
      active: true,
      followIndexPattern: 'follow',
      leaderIndexPatterns: ['leader*'],
      name: 'autoFollowPattern',
      remoteCluster: 'remoteCluster',
    });
  });
});
