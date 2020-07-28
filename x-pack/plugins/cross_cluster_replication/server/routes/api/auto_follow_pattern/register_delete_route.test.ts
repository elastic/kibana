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
import { registerDeleteRoute } from './register_delete_route';

const httpService = httpServiceMock.createSetupContract();

describe('[CCR API] Delete auto-follow pattern(s)', () => {
  let routeHandler: RequestHandler<any, any, any>;

  beforeEach(() => {
    const router = httpService.createRouter();

    registerDeleteRoute({
      router,
      license: {
        guardApiRoute: (route: any) => route,
      } as License,
      lib: {
        isEsError,
        formatEsError,
      },
    });

    routeHandler = router.delete.mock.calls[0][1];
  });

  it('deletes a single item', async () => {
    const routeContextMock = mockRouteContext({
      callAsCurrentUser: jest.fn().mockResolvedValueOnce({ acknowledge: true }),
    });

    const request = httpServerMock.createKibanaRequest({
      params: { id: 'a' },
    });

    const response = await routeHandler(routeContextMock, request, kibanaResponseFactory);
    expect(response.payload.itemsDeleted).toEqual(['a']);
    expect(response.payload.errors).toEqual([]);
  });

  it('deletes multiple items', async () => {
    const routeContextMock = mockRouteContext({
      callAsCurrentUser: jest
        .fn()
        .mockResolvedValueOnce({ acknowledge: true })
        .mockResolvedValueOnce({ acknowledge: true })
        .mockResolvedValueOnce({ acknowledge: true }),
    });

    const request = httpServerMock.createKibanaRequest({
      params: { id: 'a,b,c' },
    });

    const response = await routeHandler(routeContextMock, request, kibanaResponseFactory);
    expect(response.payload.itemsDeleted).toEqual(['a', 'b', 'c']);
    expect(response.payload.errors).toEqual([]);
  });

  it('returns partial errors', async () => {
    const routeContextMock = mockRouteContext({
      callAsCurrentUser: jest
        .fn()
        .mockResolvedValueOnce({ acknowledge: true })
        .mockRejectedValueOnce({ response: { error: {} } }),
    });

    const request = httpServerMock.createKibanaRequest({
      params: { id: 'a,b' },
    });

    const response = await routeHandler(routeContextMock, request, kibanaResponseFactory);

    expect(response.payload.itemsDeleted).toEqual(['a']);
    expect(response.payload.errors[0].id).toEqual('b');
  });
});
