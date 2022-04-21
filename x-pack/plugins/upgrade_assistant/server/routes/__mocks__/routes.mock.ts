/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandler, RequestHandlerContext } from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  savedObjectsClientMock,
  deprecationsServiceMock,
} from '@kbn/core/server/mocks';

export const routeHandlerContextMock = {
  core: {
    elasticsearch: {
      client: elasticsearchServiceMock.createScopedClusterClient(),
    },
    savedObjects: { client: savedObjectsClientMock.create() },
    deprecations: { client: deprecationsServiceMock.createClient() },
  },
} as unknown as RequestHandlerContext;

/**
 * Creates a very crude mock of the new platform router implementation. This enables use to test
 * controller/handler logic without making HTTP requests to an actual server. This does not enable
 * us to test whether our paths actual match, only the response codes of controllers given certain
 * inputs. This should be replaced by a more wholistic solution (like functional tests) eventually.
 *
 * This also bypasses any validation installed on the route.
 */
export const createMockRouter = () => {
  const paths: Record<string, Record<string, RequestHandler<any, any, any>>> = {};

  const assign =
    (method: string) =>
    ({ path }: { path: string }, handler: RequestHandler<any, any, any>) => {
      paths[method] = {
        ...(paths[method] || {}),
        ...{ [path]: handler },
      };
    };

  return {
    getHandler({ method, pathPattern }: { method: string; pathPattern: string }) {
      return paths[method][pathPattern];
    },
    get: assign('get'),
    post: assign('post'),
    put: assign('put'),
    patch: assign('patch'),
    delete: assign('delete'),
  };
};

export type MockRouter = ReturnType<typeof createMockRouter>;
