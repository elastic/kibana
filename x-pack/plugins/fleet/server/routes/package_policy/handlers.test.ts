/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from 'src/core/server/mocks';
import type { KibanaRequest } from 'kibana/server';
import type { RouteConfig } from 'kibana/server';

import { PACKAGE_POLICY_API_ROUTES } from '../../../common/constants';
import { appContextService, packagePolicyService } from '../../services';
import { createAppContextStartContractMock, xpackMocks } from '../../mocks';
import type {
  PackagePolicyServiceInterface,
  PostPackagePolicyCreateCallback,
  PutPackagePolicyUpdateCallback,
  FleetRequestHandlerContext,
} from '../..';
import type {
  CreatePackagePolicyRequestSchema,
  UpdatePackagePolicyRequestSchema,
} from '../../types/rest_spec';
import type { FleetAuthzRouter } from '../security';
import type { FleetRequestHandler } from '../../types';
import type { PackagePolicy } from '../../types';

import { registerRoutes } from './index';

const packagePolicyServiceMock = packagePolicyService as jest.Mocked<PackagePolicyServiceInterface>;

jest.mock(
  '../../services/package_policy',
  (): {
    packagePolicyService: jest.Mocked<PackagePolicyServiceInterface>;
  } => {
    return {
      packagePolicyService: {
        _compilePackagePolicyInputs: jest.fn((packageInfo, vars, dataInputs) =>
          Promise.resolve(dataInputs)
        ),
        buildPackagePolicyFromPackage: jest.fn(),
        bulkCreate: jest.fn(),
        create: jest.fn((soClient, esClient, newData) =>
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
        // @ts-ignore
        runExternalCallbacks: jest.fn((callbackType, packagePolicy, context, request) =>
          callbackType === 'postPackagePolicyDelete'
            ? Promise.resolve(undefined)
            : Promise.resolve(packagePolicy)
        ),
        upgrade: jest.fn(),
        getUpgradeDryRunDiff: jest.fn(),
        enrichPolicyWithDefaultsFromPackage: jest
          .fn()
          .mockImplementation((soClient, newPolicy) => newPolicy),
      },
    };
  }
);

jest.mock('../../services/epm/packages', () => {
  return {
    ensureInstalledPackage: jest.fn(() => Promise.resolve()),
    getPackageInfoFromRegistry: jest.fn(() => Promise.resolve()),
  };
});

describe('When calling package policy', () => {
  let routerMock: jest.Mocked<FleetAuthzRouter>;
  let routeHandler: FleetRequestHandler<any, any, any>;
  let routeConfig: RouteConfig<any, any, any, any>;
  let context: jest.Mocked<FleetRequestHandlerContext>;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;

  beforeEach(() => {
    routerMock = httpServiceMock.createRouter() as unknown as jest.Mocked<FleetAuthzRouter>;
    registerRoutes(routerMock);
  });

  beforeEach(() => {
    appContextService.start(createAppContextStartContractMock());
    context = xpackMocks.createRequestHandlerContext() as unknown as FleetRequestHandlerContext;
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
    beforeEach(() => {
      [routeConfig, routeHandler] = routerMock.post.mock.calls.find(([{ path }]) =>
        path.startsWith(PACKAGE_POLICY_API_ROUTES.CREATE_PATTERN)
      )!;
    });

    describe('and external callbacks are registered', () => {
      const callbackCallingOrder: string[] = [];

      // Callback one adds an input that includes a `config` property
      const callbackOne: PostPackagePolicyCreateCallback | PutPackagePolicyUpdateCallback = jest.fn(
        async (ds) => {
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
        }
      );

      // Callback two adds an additional `input[0].config` property
      const callbackTwo: PostPackagePolicyCreateCallback | PutPackagePolicyUpdateCallback = jest.fn(
        async (ds) => {
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
        }
      );

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

        expect(packagePolicyServiceMock.create.mock.calls[0][2]).toEqual({
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

  describe('update api handler', () => {
    const getUpdateKibanaRequest = (
      newData?: typeof UpdatePackagePolicyRequestSchema.body
    ): KibanaRequest<
      typeof UpdatePackagePolicyRequestSchema.params,
      undefined,
      typeof UpdatePackagePolicyRequestSchema.body
    > => {
      return httpServerMock.createKibanaRequest<
        typeof UpdatePackagePolicyRequestSchema.params,
        undefined,
        typeof UpdatePackagePolicyRequestSchema.body
      >({
        path: routeConfig.path,
        method: 'put',
        params: { packagePolicyId: '1' },
        body: newData || {},
      });
    };

    const existingPolicy = {
      name: 'endpoint-1',
      description: 'desc',
      policy_id: '2',
      enabled: true,
      output_id: '3',
      inputs: [
        {
          type: 'logfile',
          enabled: true,
          streams: [
            {
              enabled: true,
              data_stream: {
                type: 'logs',
                dataset: 'apache.access',
              },
              id: '1',
            },
          ],
        },
      ],
      namespace: 'default',
      package: { name: 'endpoint', title: 'Elastic Endpoint', version: '0.5.0' },
      vars: {
        paths: {
          value: ['/var/log/apache2/access.log*'],
          type: 'text',
        },
      },
    };

    beforeEach(() => {
      [routeConfig, routeHandler] = routerMock.put.mock.calls.find(([{ path }]) =>
        path.startsWith(PACKAGE_POLICY_API_ROUTES.UPDATE_PATTERN)
      )!;
    });

    beforeEach(() => {
      packagePolicyServiceMock.update.mockImplementation((soClient, esClient, policyId, newData) =>
        Promise.resolve(newData as PackagePolicy)
      );
      packagePolicyServiceMock.get.mockResolvedValue({
        id: '1',
        revision: 1,
        created_at: '',
        created_by: '',
        updated_at: '',
        updated_by: '',
        ...existingPolicy,
        inputs: [
          {
            ...existingPolicy.inputs[0],
            compiled_input: '',
            streams: [
              {
                ...existingPolicy.inputs[0].streams[0],
                compiled_stream: {},
              },
            ],
          },
        ],
      });
    });

    it('should use existing package policy props if not provided by request', async () => {
      const request = getUpdateKibanaRequest();
      await routeHandler(context, request, response);
      expect(response.ok).toHaveBeenCalledWith({
        body: { item: existingPolicy },
      });
    });

    it('should use request package policy props if provided by request', async () => {
      const newData = {
        name: 'endpoint-2',
        description: '',
        policy_id: '3',
        enabled: false,
        output_id: '',
        inputs: [
          {
            type: 'metrics',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: {
                  type: 'metrics',
                  dataset: 'apache.access',
                },
                id: '1',
              },
            ],
          },
        ],
        namespace: 'namespace',
        package: { name: 'endpoint', title: 'Elastic Endpoint', version: '0.6.0' },
        vars: {
          paths: {
            value: ['/my/access.log*'],
            type: 'text',
          },
        },
      };
      const request = getUpdateKibanaRequest(newData as any);
      await routeHandler(context, request, response);
      expect(response.ok).toHaveBeenCalledWith({
        body: { item: newData },
      });
    });

    it('should override props provided by request only', async () => {
      const newData = {
        namespace: 'namespace',
      };
      const request = getUpdateKibanaRequest(newData as any);
      await routeHandler(context, request, response);
      expect(response.ok).toHaveBeenCalledWith({
        body: { item: { ...existingPolicy, namespace: 'namespace' } },
      });
    });
  });
});
