/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { httpServerMock, httpServiceMock } from 'src/core/server/mocks';
import { kibanaResponseFactory, RequestHandlerContext, RequestHandler } from 'src/core/server';

import { License } from '../../../services/license';
import { IndexDataEnricher } from '../../../services/index_data_enricher';

import { registerPrivilegesRoute } from './privileges';

jest.mock('../../../services/index_data_enricher');

const httpService = httpServiceMock.createSetupContract();

const mockedIndexDataEnricher = new IndexDataEnricher();

const mockRouteContext = ({
  callAsCurrentUser,
}: {
  callAsCurrentUser: any;
}): RequestHandlerContext => {
  const routeContextMock = ({
    core: {
      elasticsearch: {
        legacy: {
          client: {
            callAsCurrentUser,
          },
        },
      },
    },
  } as unknown) as RequestHandlerContext;

  return routeContextMock;
};

describe('GET privileges', () => {
  let routeHandler: RequestHandler<any, any, any>;

  beforeEach(() => {
    const router = httpService.createRouter();

    registerPrivilegesRoute({
      router,
      license: {
        guardApiRoute: (route: any) => route,
      } as License,
      config: {
        isSecurityEnabled: () => true,
      },
      indexDataEnricher: mockedIndexDataEnricher,
      lib: {
        isEsError: jest.fn(),
      },
    });

    routeHandler = router.get.mock.calls[0][1];
  });

  it('should return the correct response when a user has privileges', async () => {
    const privilegesResponseMock = {
      username: 'elastic',
      has_all_requested: true,
      cluster: { manage_index_templates: true },
      index: {},
      application: {},
    };

    const routeContextMock = mockRouteContext({
      callAsCurrentUser: jest.fn().mockResolvedValueOnce(privilegesResponseMock),
    });

    const request = httpServerMock.createKibanaRequest();
    const response = await routeHandler(routeContextMock, request, kibanaResponseFactory);

    expect(response.payload).toEqual({
      hasAllPrivileges: true,
      missingPrivileges: {
        cluster: [],
      },
    });
  });

  it('should return the correct response when a user does not have privileges', async () => {
    const privilegesResponseMock = {
      username: 'elastic',
      has_all_requested: false,
      cluster: { manage_index_templates: false },
      index: {},
      application: {},
    };

    const routeContextMock = mockRouteContext({
      callAsCurrentUser: jest.fn().mockResolvedValueOnce(privilegesResponseMock),
    });

    const request = httpServerMock.createKibanaRequest();
    const response = await routeHandler(routeContextMock, request, kibanaResponseFactory);

    expect(response.payload).toEqual({
      hasAllPrivileges: false,
      missingPrivileges: {
        cluster: ['manage_index_templates'],
      },
    });
  });

  describe('With security disabled', () => {
    beforeEach(() => {
      const router = httpService.createRouter();

      registerPrivilegesRoute({
        router,
        license: {
          guardApiRoute: (route: any) => route,
        } as License,
        config: {
          isSecurityEnabled: () => false,
        },
        indexDataEnricher: mockedIndexDataEnricher,
        lib: {
          isEsError: jest.fn(),
        },
      });

      routeHandler = router.get.mock.calls[0][1];
    });

    it('should return the default privileges response', async () => {
      const routeContextMock = mockRouteContext({
        callAsCurrentUser: jest.fn(),
      });

      const request = httpServerMock.createKibanaRequest();
      const response = await routeHandler(routeContextMock, request, kibanaResponseFactory);

      expect(response.payload).toEqual({
        hasAllPrivileges: true,
        missingPrivileges: {
          cluster: [],
        },
      });
    });
  });
});
