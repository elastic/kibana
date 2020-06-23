/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { httpServerMock, httpServiceMock } from 'src/core/server/mocks';
import { IRouter, KibanaRequest, RequestHandler, RouteConfig } from 'kibana/server';
import { registerRoutes } from './index';
import { DATASOURCE_API_ROUTES } from '../../../common/constants';
import { xpackMocks } from '../../../../../mocks';
import { appContextService } from '../../services';
import { createAppContextStartContractMock } from '../../mocks';
import { DatasourceServiceInterface } from '../..';
import { CreateDatasourceRequestSchema } from '../../types/rest_spec';

jest.mock('../../services/datasource', (): {
  datasourceService: jest.Mock<DatasourceServiceInterface>;
} => {
  return {
    datasourceService: {
      assignPackageStream: jest.fn((packageInfo, dataInputs) => Promise.resolve(dataInputs)),
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

jest.mock('../../services/epm/packages', () => {
  return {
    ensureInstalledPackage: jest.fn(() => Promise.resolve()),
    getPackageInfo: jest.fn(() => Promise.resolve()),
  };
});

describe('When calling datasource', () => {
  let routerMock: jest.Mocked<IRouter>;
  let routeHandler: RequestHandler<any, any, any>;
  let routeConfig: RouteConfig<any, any, any, any>;
  let context: ReturnType<typeof xpackMocks.createRequestHandlerContext>;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;

  beforeAll(() => {
    routerMock = httpServiceMock.createRouter();
    appContextService.start(createAppContextStartContractMock());
    registerRoutes(routerMock);
  });

  beforeEach(() => {
    context = xpackMocks.createRequestHandlerContext();
    response = httpServerMock.createResponseFactory();
  });

  afterAll(() => {
    appContextService.stop();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create api handler', () => {
    const getCreateKibanaRequest: KibanaRequest<
      undefined,
      undefined,
      typeof CreateDatasourceRequestSchema.body
    > = (newData?: typeof CreateDatasourceRequestSchema.body) => {
      return httpServerMock.createKibanaRequest<
        undefined,
        undefined,
        typeof CreateDatasourceRequestSchema.body
      >({
        path: routeConfig.path,
        method: 'post',
        body: newData || {
          name: 'endpoint-1',
          description: '',
          config_id: 'a5ca00c0-b30c-11ea-9732-1bb05811278c',
          enabled: true,
          output_id: '',
          inputs: [],
          namespace: 'default',
          package: { name: 'endpoint', title: 'Elastic Endpoint', version: '0.5.0' },
        },
      });
    };

    // Set the routeConfig and routeHandler to the Create API
    beforeAll(() => {
      [routeConfig, routeHandler] = routerMock.post.mock.calls.find(([{ path }]) =>
        path.startsWith(DATASOURCE_API_ROUTES.CREATE_PATTERN)
      )!;
    });

    describe('and external callbacks are registered', () => {
      it('should call external callbacks', async () => {
        const request = getCreateKibanaRequest();
        await routeHandler(context, request, response);
        expect(response.ok).toHaveBeenCalled();
      });
    });
  });
});
