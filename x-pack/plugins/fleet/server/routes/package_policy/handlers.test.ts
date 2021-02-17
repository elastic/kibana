/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from 'src/core/server/mocks';
import { IRouter, KibanaRequest, RequestHandler, RouteConfig } from 'kibana/server';
import { registerRoutes } from './index';
import { PACKAGE_POLICY_API_ROUTES } from '../../../common/constants';
import { appContextService } from '../../services';
import { createAppContextStartContractMock, xpackMocks } from '../../mocks';
import { PackagePolicyServiceInterface, ExternalCallback } from '../..';
import { CreatePackagePolicyRequestSchema } from '../../types/rest_spec';
import { packagePolicyService } from '../../services';

const packagePolicyServiceMock = packagePolicyService as jest.Mocked<PackagePolicyServiceInterface>;

jest.mock('../../services/package_policy', (): {
  packagePolicyService: jest.Mocked<PackagePolicyServiceInterface>;
} => {
  return {
    packagePolicyService: {
      compilePackagePolicyInputs: jest.fn((packageInfo, dataInputs) => Promise.resolve(dataInputs)),
      buildPackagePolicyFromPackage: jest.fn(),
      bulkCreate: jest.fn(),
      create: jest.fn((soClient, esClient, callCluster, newData) =>
        Promise.resolve({
          ...newData,
          inputs: newData.inputs.map((input) => ({
            ...input,
            streams: input.streams.map((stream) => ({
              id: stream.data_stream.dataset,
              ...stream,
            })),
          })),
          id: '1',
          revision: 1,
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
      listIds: jest.fn(),
      update: jest.fn(),
      runExternalCallbacks: jest.fn((callbackType, newPackagePolicy, context, request) =>
        Promise.resolve(newPackagePolicy)
      ),
    },
  };
});

jest.mock('../../services/epm/packages', () => {
  return {
    ensureInstalledPackage: jest.fn(() => Promise.resolve()),
    getPackageInfo: jest.fn(() => Promise.resolve()),
  };
});

describe('When calling package policy', () => {
  let routerMock: jest.Mocked<IRouter>;
  let routeHandler: RequestHandler<any, any, any>;
  let routeConfig: RouteConfig<any, any, any, any>;
  let context: ReturnType<typeof xpackMocks.createRequestHandlerContext>;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;

  beforeAll(() => {
    routerMock = httpServiceMock.createRouter();
    registerRoutes(routerMock);
  });

  beforeEach(() => {
    appContextService.start(createAppContextStartContractMock());
    context = xpackMocks.createRequestHandlerContext();
    response = httpServerMock.createResponseFactory();
  });

  afterEach(() => {
    jest.clearAllMocks();
    appContextService.stop();
  });

  describe('create api handler', () => {
    const getCreateKibanaRequest = (
      newData?: typeof CreatePackagePolicyRequestSchema.body
    ): KibanaRequest<undefined, undefined, typeof CreatePackagePolicyRequestSchema.body> => {
      return httpServerMock.createKibanaRequest<
        undefined,
        undefined,
        typeof CreatePackagePolicyRequestSchema.body
      >({
        path: routeConfig.path,
        method: 'post',
        body: newData || {
          name: 'endpoint-1',
          description: '',
          policy_id: 'a5ca00c0-b30c-11ea-9732-1bb05811278c',
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
        path.startsWith(PACKAGE_POLICY_API_ROUTES.CREATE_PATTERN)
      )!;
    });

    describe('and external callbacks are registered', () => {
      const callbackCallingOrder: string[] = [];

      // Callback one adds an input that includes a `config` property
      const callbackOne: ExternalCallback[1] = jest.fn(async (ds) => {
        callbackCallingOrder.push('one');
        const newDs = {
          ...ds,
          inputs: [
            {
              type: 'endpoint',
              enabled: true,
              streams: [],
              config: {
                one: {
                  value: 'inserted by callbackOne',
                },
              },
            },
          ],
        };
        return newDs;
      });

      // Callback two adds an additional `input[0].config` property
      const callbackTwo: ExternalCallback[1] = jest.fn(async (ds) => {
        callbackCallingOrder.push('two');
        const newDs = {
          ...ds,
          inputs: [
            {
              ...ds.inputs[0],
              config: {
                ...ds.inputs[0].config,
                two: {
                  value: 'inserted by callbackTwo',
                },
              },
            },
          ],
        };
        return newDs;
      });

      beforeEach(() => {
        appContextService.addExternalCallback('packagePolicyCreate', callbackOne);
        appContextService.addExternalCallback('packagePolicyCreate', callbackTwo);
      });

      afterEach(() => (callbackCallingOrder.length = 0));

      it('should create with data from callback', async () => {
        const request = getCreateKibanaRequest();
        packagePolicyServiceMock.runExternalCallbacks.mockImplementationOnce(() =>
          Promise.resolve({
            policy_id: 'a5ca00c0-b30c-11ea-9732-1bb05811278c',
            description: '',
            enabled: true,
            inputs: [
              {
                config: {
                  one: {
                    value: 'inserted by callbackOne',
                  },
                  two: {
                    value: 'inserted by callbackTwo',
                  },
                },
                enabled: true,
                streams: [],
                type: 'endpoint',
              },
            ],
            name: 'endpoint-1',
            namespace: 'default',
            output_id: '',
            package: {
              name: 'endpoint',
              title: 'Elastic Endpoint',
              version: '0.5.0',
            },
          })
        );
        await routeHandler(context, request, response);
        expect(response.ok).toHaveBeenCalled();
        expect(packagePolicyServiceMock.create.mock.calls[0][3]).toEqual({
          policy_id: 'a5ca00c0-b30c-11ea-9732-1bb05811278c',
          description: '',
          enabled: true,
          inputs: [
            {
              config: {
                one: {
                  value: 'inserted by callbackOne',
                },
                two: {
                  value: 'inserted by callbackTwo',
                },
              },
              enabled: true,
              streams: [],
              type: 'endpoint',
            },
          ],
          name: 'endpoint-1',
          namespace: 'default',
          output_id: '',
          package: {
            name: 'endpoint',
            title: 'Elastic Endpoint',
            version: '0.5.0',
          },
        });
      });
    });
  });
});
