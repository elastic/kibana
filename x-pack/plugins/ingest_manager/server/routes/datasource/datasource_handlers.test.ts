/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { httpServerMock, httpServiceMock } from 'src/core/server/mocks';
import { IRouter, RequestHandler, RouteConfig } from 'kibana/server';
import { registerRoutes } from './index';
import { DATASOURCE_API_ROUTES } from '../../../common/constants';
import { xpackMocks } from '../../../../../mocks';
import { appContextService } from '../../services';
import { createAppContextStartContractMock } from '../../mocks';
import { DatasourceServiceInterface } from '../..';

jest.mock('../../services/datasource', (): {
  datasourceService: jest.Mock<DatasourceServiceInterface>;
} => {
  return {
    datasourceService: {
      assignPackageStream: jest.fn((packageInfo, dataInputs) => Promise.resolved(dataInputs)),
      buildDatasourceFromPackage: jest.fn(),
      bulkCreate: jest.fn(),
      create: jest.fn((soClient, newData) =>
        Promise.resolve({
          ...newData,
          id: '1',
          revision: '1',
          updated_at: new Date().toISOString(),
          updated_by: 'elastic',
          created_at: new Date().toISOString(),
          created_by: 'elastic',
        })
      ),
      delete: jest.fn(),
      get: jest.fn(),
      getByIDs: jest.fn(),
      list: jest.fn(),
      update: jest.fn(),
    },
  };
});

describe('When calling datasource', () => {
  let routerMock: jest.Mocked<IRouter>;
  let routeHandler: RequestHandler<any, any, any>;
  let routeConfig: RouteConfig<any, any, any, any>;

  beforeAll(() => {
    routerMock = httpServiceMock.createRouter();
    appContextService.start(createAppContextStartContractMock());
    registerRoutes(routerMock);
  });

  afterAll(() => {
    appContextService.stop();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create api handler', () => {
    beforeAll(() => {
      [routeConfig, routeHandler] = routerMock.post.mock.calls.find(([{ path }]) =>
        path.startsWith(DATASOURCE_API_ROUTES.CREATE_PATTERN)
      )!;
    });

    describe('and external callbacks are registered', () => {
      it('should call external callbacks', async () => {
        const context = xpackMocks.createRequestHandlerContext();
        const request = httpServerMock.createKibanaRequest({
          path: DATASOURCE_API_ROUTES.CREATE_PATTERN,
          method: 'post',
          body: {},
        });
        const response = httpServerMock.createResponseFactory();
        const apiResponseData = await routeHandler(context, request, response);
        expect(response.ok).toHaveBeenCalled();
      });
    });
  });
});
