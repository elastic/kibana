/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  savedObjectsClientMock,
  httpServerMock,
} from 'src/core/server/mocks';

import type { SavedObjectsClient, SavedObjectsUpdateResponse } from 'src/core/server';
import type { KibanaRequest } from 'kibana/server';

import type {
  PackageInfo,
  PackagePolicySOAttributes,
  AgentPolicySOAttributes,
  PostPackagePolicyDeleteCallback,
  RegistryDataStream,
  PackagePolicyInputStream,
} from '../types';
import { createPackagePolicyMock } from '../../common/mocks';

import type { PutPackagePolicyUpdateCallback, PostPackagePolicyCreateCallback } from '..';

import { createAppContextStartContractMock, xpackMocks } from '../mocks';

import type {
  DeletePackagePoliciesResponse,
  InputsOverride,
  NewPackagePolicy,
  NewPackagePolicyInput,
  RegistryPackage,
} from '../../common';

import { IngestManagerError } from '../errors';

import {
  overridePackageInputs,
  packagePolicyService,
  _applyIndexPrivileges,
} from './package_policy';
import { appContextService } from './app_context';
import { fetchInfo } from './epm/registry';

async function mockedGetAssetsData(_a: any, _b: any, dataset: string) {
  if (dataset === 'dataset1') {
    return [
      {
        buffer: Buffer.from(`
type: log
metricset: ["dataset1"]
paths:
{{#each paths}}
- {{this}}
{{/each}}
{{#if hosts}}
hosts:
{{#each hosts}}
- {{this}}
{{/each}}
{{/if}}
`),
      },
    ];
  }
  if (dataset === 'dataset1_level1') {
    return [
      {
        buffer: Buffer.from(`
type: log
metricset: ["dataset1.level1"]
`),
      },
    ];
  }

  return [
    {
      buffer: Buffer.from(`
hosts:
{{#each hosts}}
- {{this}}
{{/each}}
`),
    },
  ];
}

function mockedRegistryInfo(): RegistryPackage {
  return {} as RegistryPackage;
}

jest.mock('./epm/packages/assets', () => {
  return {
    getAssetsData: mockedGetAssetsData,
  };
});

jest.mock('./epm/packages', () => {
  return {
    getPackageInfo: () => ({}),
  };
});

jest.mock('./epm/registry');

jest.mock('./agent_policy', () => {
  return {
    agentPolicyService: {
      get: async (soClient: SavedObjectsClient, id: string) => {
        const agentPolicySO = await soClient.get<AgentPolicySOAttributes>(
          'ingest-agent-policies',
          id
        );
        if (!agentPolicySO) {
          return null;
        }
        const agentPolicy = { id: agentPolicySO.id, ...agentPolicySO.attributes };
        agentPolicy.package_policies = [];
        return agentPolicy;
      },
      bumpRevision: () => {},
    },
  };
});

const mockedFetchInfo = fetchInfo as jest.Mock<ReturnType<typeof fetchInfo>>;

type CombinedExternalCallback = PutPackagePolicyUpdateCallback | PostPackagePolicyCreateCallback;

describe('Package policy service', () => {
  beforeEach(() => {
    mockedFetchInfo.mockResolvedValue({} as RegistryPackage);
  });
  describe('_compilePackagePolicyInputs', () => {
    it('should work with config variables from the stream', async () => {
      const inputs = await packagePolicyService._compilePackagePolicyInputs(
        mockedRegistryInfo(),
        {
          data_streams: [
            {
              type: 'logs',
              dataset: 'package.dataset1',
              streams: [{ input: 'log', template_path: 'some_template_path.yml' }],
              path: 'dataset1',
            },
          ],
          policy_templates: [
            {
              inputs: [{ type: 'log' }],
            },
          ],
        } as unknown as PackageInfo,
        {},
        [
          {
            type: 'log',
            enabled: true,
            streams: [
              {
                id: 'datastream01',
                data_stream: { dataset: 'package.dataset1', type: 'logs' },
                enabled: true,
                vars: {
                  paths: {
                    value: ['/var/log/set.log'],
                  },
                },
              },
            ],
          },
        ]
      );

      expect(inputs).toEqual([
        {
          type: 'log',
          enabled: true,
          streams: [
            {
              id: 'datastream01',
              data_stream: { dataset: 'package.dataset1', type: 'logs' },
              enabled: true,
              vars: {
                paths: {
                  value: ['/var/log/set.log'],
                },
              },
              compiled_stream: {
                metricset: ['dataset1'],
                paths: ['/var/log/set.log'],
                type: 'log',
              },
            },
          ],
        },
      ]);
    });

    it('should work with a two level dataset name', async () => {
      const inputs = await packagePolicyService._compilePackagePolicyInputs(
        mockedRegistryInfo(),
        {
          data_streams: [
            {
              type: 'logs',
              dataset: 'package.dataset1.level1',
              streams: [{ input: 'log', template_path: 'some_template_path.yml' }],
              path: 'dataset1_level1',
            },
          ],
          policy_templates: [
            {
              inputs: [{ type: 'log' }],
            },
          ],
        } as unknown as PackageInfo,
        {},
        [
          {
            type: 'log',
            enabled: true,
            streams: [
              {
                id: 'datastream01',
                data_stream: { dataset: 'package.dataset1.level1', type: 'logs' },
                enabled: true,
              },
            ],
          },
        ]
      );

      expect(inputs).toEqual([
        {
          type: 'log',
          enabled: true,
          streams: [
            {
              id: 'datastream01',
              data_stream: { dataset: 'package.dataset1.level1', type: 'logs' },
              enabled: true,
              compiled_stream: {
                metricset: ['dataset1.level1'],
                type: 'log',
              },
            },
          ],
        },
      ]);
    });

    it('should work with config variables at the input level', async () => {
      const inputs = await packagePolicyService._compilePackagePolicyInputs(
        mockedRegistryInfo(),
        {
          data_streams: [
            {
              dataset: 'package.dataset1',
              type: 'logs',
              streams: [{ input: 'log', template_path: 'some_template_path.yml' }],
              path: 'dataset1',
            },
          ],
          policy_templates: [
            {
              inputs: [{ type: 'log' }],
            },
          ],
        } as unknown as PackageInfo,
        {},
        [
          {
            type: 'log',
            enabled: true,
            vars: {
              paths: {
                value: ['/var/log/set.log'],
              },
            },
            streams: [
              {
                id: 'datastream01',
                data_stream: { dataset: 'package.dataset1', type: 'logs' },
                enabled: true,
              },
            ],
          },
        ]
      );

      expect(inputs).toEqual([
        {
          type: 'log',
          enabled: true,
          vars: {
            paths: {
              value: ['/var/log/set.log'],
            },
          },
          streams: [
            {
              id: 'datastream01',
              data_stream: { dataset: 'package.dataset1', type: 'logs' },
              enabled: true,
              compiled_stream: {
                metricset: ['dataset1'],
                paths: ['/var/log/set.log'],
                type: 'log',
              },
            },
          ],
        },
      ]);
    });

    it('should work with config variables at the package level', async () => {
      const inputs = await packagePolicyService._compilePackagePolicyInputs(
        mockedRegistryInfo(),
        {
          data_streams: [
            {
              dataset: 'package.dataset1',
              type: 'logs',
              streams: [{ input: 'log', template_path: 'some_template_path.yml' }],
              path: 'dataset1',
            },
          ],
          policy_templates: [
            {
              inputs: [{ type: 'log' }],
            },
          ],
        } as unknown as PackageInfo,
        {
          hosts: {
            value: ['localhost'],
          },
        },
        [
          {
            type: 'log',
            enabled: true,
            vars: {
              paths: {
                value: ['/var/log/set.log'],
              },
            },
            streams: [
              {
                id: 'datastream01',
                data_stream: { dataset: 'package.dataset1', type: 'logs' },
                enabled: true,
              },
            ],
          },
        ]
      );

      expect(inputs).toEqual([
        {
          type: 'log',
          enabled: true,
          vars: {
            paths: {
              value: ['/var/log/set.log'],
            },
          },
          streams: [
            {
              id: 'datastream01',
              data_stream: { dataset: 'package.dataset1', type: 'logs' },
              enabled: true,
              compiled_stream: {
                metricset: ['dataset1'],
                paths: ['/var/log/set.log'],
                type: 'log',
                hosts: ['localhost'],
              },
            },
          ],
        },
      ]);
    });

    it('should work with an input with a template and no streams', async () => {
      const inputs = await packagePolicyService._compilePackagePolicyInputs(
        mockedRegistryInfo(),
        {
          data_streams: [],
          policy_templates: [
            {
              inputs: [{ type: 'log', template_path: 'some_template_path.yml' }],
            },
          ],
        } as unknown as PackageInfo,
        {},
        [
          {
            type: 'log',
            enabled: true,
            vars: {
              hosts: {
                value: ['localhost'],
              },
            },
            streams: [],
          },
        ]
      );

      expect(inputs).toEqual([
        {
          type: 'log',
          enabled: true,
          vars: {
            hosts: {
              value: ['localhost'],
            },
          },
          compiled_input: {
            hosts: ['localhost'],
          },
          streams: [],
        },
      ]);
    });

    it('should work with an input with a template and streams', async () => {
      const inputs = await packagePolicyService._compilePackagePolicyInputs(
        mockedRegistryInfo(),
        {
          data_streams: [
            {
              dataset: 'package.dataset1',
              type: 'logs',
              streams: [{ input: 'log', template_path: 'some_template_path.yml' }],
              path: 'dataset1',
            },
          ],
          policy_templates: [
            {
              name: 'template_1',
              inputs: [{ type: 'log', template_path: 'some_template_path.yml' }],
            },
            {
              name: 'template_2',
              inputs: [{ type: 'log', template_path: 'some_template_path.yml' }],
            },
          ],
        } as unknown as PackageInfo,
        {},
        [
          {
            type: 'log',
            policy_template: 'template_1',
            enabled: true,
            vars: {
              hosts: {
                value: ['localhost'],
              },
              paths: {
                value: ['/var/log/set.log'],
              },
            },
            streams: [
              {
                id: 'datastream01',
                data_stream: { dataset: 'package.dataset1', type: 'logs' },
                enabled: true,
              },
            ],
          },
          {
            type: 'log',
            policy_template: 'template_2',
            enabled: true,
            vars: {
              hosts: {
                value: ['localhost'],
              },
            },
            streams: [],
          },
        ]
      );

      expect(inputs).toEqual([
        {
          type: 'log',
          policy_template: 'template_1',
          enabled: true,
          vars: {
            hosts: {
              value: ['localhost'],
            },
            paths: {
              value: ['/var/log/set.log'],
            },
          },
          compiled_input: {
            hosts: ['localhost'],
          },
          streams: [
            {
              id: 'datastream01',
              data_stream: { dataset: 'package.dataset1', type: 'logs' },
              enabled: true,
              compiled_stream: {
                metricset: ['dataset1'],
                paths: ['/var/log/set.log'],
                hosts: ['localhost'],
                type: 'log',
              },
            },
          ],
        },
        {
          type: 'log',
          policy_template: 'template_2',
          enabled: true,
          vars: {
            hosts: {
              value: ['localhost'],
            },
          },
          compiled_input: {
            hosts: ['localhost'],
          },
          streams: [],
        },
      ]);
    });

    it('should work with a package without input', async () => {
      const inputs = await packagePolicyService._compilePackagePolicyInputs(
        mockedRegistryInfo(),
        {
          policy_templates: [
            {
              inputs: undefined,
            },
          ],
        } as unknown as PackageInfo,
        {},
        []
      );

      expect(inputs).toEqual([]);
    });

    it('should work with a package with a empty inputs array', async () => {
      const inputs = await packagePolicyService._compilePackagePolicyInputs(
        mockedRegistryInfo(),
        {
          policy_templates: [
            {
              inputs: [],
            },
          ],
        } as unknown as PackageInfo,
        {},
        []
      );

      expect(inputs).toEqual([]);
    });
  });

  describe('update', () => {
    it('should fail to update on version conflict', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.get.mockResolvedValue({
        id: 'test',
        type: 'abcd',
        references: [],
        version: 'test',
        attributes: createPackagePolicyMock(),
      });
      savedObjectsClient.update.mockImplementation(
        async (
          _type: string,
          _id: string
        ): Promise<SavedObjectsUpdateResponse<PackagePolicySOAttributes>> => {
          throw savedObjectsClient.errors.createConflictError('abc', '123');
        }
      );
      const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      await expect(
        packagePolicyService.update(
          savedObjectsClient,
          elasticsearchClient,
          'the-package-policy-id',
          createPackagePolicyMock()
        )
      ).rejects.toThrow('Saved object [abc/123] conflict');
    });

    it('should only update input vars that are not frozen', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      const mockPackagePolicy = createPackagePolicyMock();
      const mockInputs = [
        {
          config: {},
          enabled: true,
          keep_enabled: true,
          type: 'endpoint',
          vars: {
            dog: {
              type: 'text',
              value: 'dalmatian',
            },
            cat: {
              type: 'text',
              value: 'siamese',
              frozen: true,
            },
          },
          streams: [
            {
              data_stream: {
                type: 'birds',
                dataset: 'migratory.patterns',
              },
              enabled: false,
              id: `endpoint-migratory.patterns-${mockPackagePolicy.id}`,
              vars: {
                paths: {
                  value: ['north', 'south'],
                  type: 'text',
                  frozen: true,
                },
                period: {
                  value: '6mo',
                  type: 'text',
                },
              },
            },
          ],
        },
      ];
      const inputsUpdate = [
        {
          config: {},
          enabled: false,
          type: 'endpoint',
          vars: {
            dog: {
              type: 'text',
              value: 'labrador',
            },
            cat: {
              type: 'text',
              value: 'tabby',
            },
          },
          streams: [
            {
              data_stream: {
                type: 'birds',
                dataset: 'migratory.patterns',
              },
              enabled: false,
              id: `endpoint-migratory.patterns-${mockPackagePolicy.id}`,
              vars: {
                paths: {
                  value: ['east', 'west'],
                  type: 'text',
                },
                period: {
                  value: '12mo',
                  type: 'text',
                },
              },
            },
          ],
        },
      ];
      const attributes = {
        ...mockPackagePolicy,
        inputs: mockInputs,
      };

      savedObjectsClient.get.mockResolvedValue({
        id: 'test',
        type: 'abcd',
        references: [],
        version: 'test',
        attributes,
      });

      savedObjectsClient.update.mockImplementation(
        async (
          type: string,
          id: string,
          attrs: any
        ): Promise<SavedObjectsUpdateResponse<PackagePolicySOAttributes>> => {
          savedObjectsClient.get.mockResolvedValue({
            id: 'test',
            type: 'abcd',
            references: [],
            version: 'test',
            attributes: attrs,
          });
          return attrs;
        }
      );
      const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      const result = await packagePolicyService.update(
        savedObjectsClient,
        elasticsearchClient,
        'the-package-policy-id',
        { ...mockPackagePolicy, inputs: inputsUpdate }
      );

      const [modifiedInput] = result.inputs;
      expect(modifiedInput.enabled).toEqual(true);
      expect(modifiedInput.vars!.dog.value).toEqual('labrador');
      expect(modifiedInput.vars!.cat.value).toEqual('siamese');
      const [modifiedStream] = modifiedInput.streams;
      expect(modifiedStream.vars!.paths.value).toEqual(expect.arrayContaining(['north', 'south']));
      expect(modifiedStream.vars!.period.value).toEqual('12mo');
    });

    it('should add new input vars when updating', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      const mockPackagePolicy = createPackagePolicyMock();
      const mockInputs = [
        {
          config: {},
          enabled: true,
          keep_enabled: true,
          type: 'endpoint',
          vars: {
            dog: {
              type: 'text',
              value: 'dalmatian',
            },
            cat: {
              type: 'text',
              value: 'siamese',
              frozen: true,
            },
          },
          streams: [
            {
              data_stream: {
                type: 'birds',
                dataset: 'migratory.patterns',
              },
              enabled: false,
              id: `endpoint-migratory.patterns-${mockPackagePolicy.id}`,
              vars: {
                paths: {
                  value: ['north', 'south'],
                  type: 'text',
                  frozen: true,
                },
              },
            },
          ],
        },
      ];
      const inputsUpdate = [
        {
          config: {},
          enabled: false,
          type: 'endpoint',
          vars: {
            dog: {
              type: 'text',
              value: 'labrador',
            },
            cat: {
              type: 'text',
              value: 'tabby',
            },
          },
          streams: [
            {
              data_stream: {
                type: 'birds',
                dataset: 'migratory.patterns',
              },
              enabled: false,
              id: `endpoint-migratory.patterns-${mockPackagePolicy.id}`,
              vars: {
                paths: {
                  value: ['east', 'west'],
                  type: 'text',
                },
                period: {
                  value: '12mo',
                  type: 'text',
                },
              },
            },
          ],
        },
      ];
      const attributes = {
        ...mockPackagePolicy,
        inputs: mockInputs,
      };

      savedObjectsClient.get.mockResolvedValue({
        id: 'test',
        type: 'abcd',
        references: [],
        version: 'test',
        attributes,
      });

      savedObjectsClient.update.mockImplementation(
        async (
          type: string,
          id: string,
          attrs: any
        ): Promise<SavedObjectsUpdateResponse<PackagePolicySOAttributes>> => {
          savedObjectsClient.get.mockResolvedValue({
            id: 'test',
            type: 'abcd',
            references: [],
            version: 'test',
            attributes: attrs,
          });
          return attrs;
        }
      );
      const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      const result = await packagePolicyService.update(
        savedObjectsClient,
        elasticsearchClient,
        'the-package-policy-id',
        { ...mockPackagePolicy, inputs: inputsUpdate }
      );

      const [modifiedInput] = result.inputs;
      expect(modifiedInput.enabled).toEqual(true);
      expect(modifiedInput.vars!.dog.value).toEqual('labrador');
      expect(modifiedInput.vars!.cat.value).toEqual('siamese');
      const [modifiedStream] = modifiedInput.streams;
      expect(modifiedStream.vars!.paths.value).toEqual(expect.arrayContaining(['north', 'south']));
      expect(modifiedStream.vars!.period.value).toEqual('12mo');
    });

    it('should update elasticsearch.priviles.cluster when updating', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      const mockPackagePolicy = createPackagePolicyMock();

      const attributes = {
        ...mockPackagePolicy,
        inputs: [],
      };

      mockedFetchInfo.mockResolvedValue({
        elasticsearch: {
          privileges: {
            cluster: ['monitor'],
          },
        },
      } as RegistryPackage);

      savedObjectsClient.get.mockResolvedValue({
        id: 'test',
        type: 'abcd',
        references: [],
        version: 'test',
        attributes,
      });

      savedObjectsClient.update.mockImplementation(
        async (
          type: string,
          id: string,
          attrs: any
        ): Promise<SavedObjectsUpdateResponse<PackagePolicySOAttributes>> => {
          savedObjectsClient.get.mockResolvedValue({
            id: 'test',
            type: 'abcd',
            references: [],
            version: 'test',
            attributes: attrs,
          });
          return attrs;
        }
      );
      const elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      const result = await packagePolicyService.update(
        savedObjectsClient,
        elasticsearchClient,
        'the-package-policy-id',
        { ...mockPackagePolicy, inputs: [] }
      );

      expect(result.elasticsearch).toMatchObject({ privileges: { cluster: ['monitor'] } });
    });
  });

  describe('runDeleteExternalCallbacks', () => {
    let callbackOne: jest.MockedFunction<PostPackagePolicyDeleteCallback>;
    let callbackTwo: jest.MockedFunction<PostPackagePolicyDeleteCallback>;
    let callingOrder: string[];
    let deletedPackagePolicies: DeletePackagePoliciesResponse;

    beforeEach(() => {
      appContextService.start(createAppContextStartContractMock());
      callingOrder = [];
      deletedPackagePolicies = [
        { id: 'a', success: true },
        { id: 'a', success: true },
      ];
      callbackOne = jest.fn(async (deletedPolicies) => {
        callingOrder.push('one');
      });
      callbackTwo = jest.fn(async (deletedPolicies) => {
        callingOrder.push('two');
      });
      appContextService.addExternalCallback('postPackagePolicyDelete', callbackOne);
      appContextService.addExternalCallback('postPackagePolicyDelete', callbackTwo);
    });

    afterEach(() => {
      appContextService.stop();
    });

    it('should execute external callbacks', async () => {
      await packagePolicyService.runDeleteExternalCallbacks(deletedPackagePolicies);

      expect(callbackOne).toHaveBeenCalledWith(deletedPackagePolicies);
      expect(callbackTwo).toHaveBeenCalledWith(deletedPackagePolicies);
      expect(callingOrder).toEqual(['one', 'two']);
    });

    it("should execute all external callbacks even if one throw's", async () => {
      callbackOne.mockImplementation(async (deletedPolicies) => {
        callingOrder.push('one');
        throw new Error('foo');
      });
      await expect(
        packagePolicyService.runDeleteExternalCallbacks(deletedPackagePolicies)
      ).rejects.toThrow(IngestManagerError);
      expect(callingOrder).toEqual(['one', 'two']);
    });

    it('should provide an array of errors encountered by running external callbacks', async () => {
      let error: IngestManagerError;
      const callbackOneError = new Error('foo 1');
      const callbackTwoError = new Error('foo 2');

      callbackOne.mockImplementation(async (deletedPolicies) => {
        callingOrder.push('one');
        throw callbackOneError;
      });
      callbackTwo.mockImplementation(async (deletedPolicies) => {
        callingOrder.push('two');
        throw callbackTwoError;
      });

      await packagePolicyService.runDeleteExternalCallbacks(deletedPackagePolicies).catch((e) => {
        error = e;
      });

      expect(error!.message).toEqual(
        '2 encountered while executing package delete external callbacks'
      );
      expect(error!.meta).toEqual([callbackOneError, callbackTwoError]);
      expect(callingOrder).toEqual(['one', 'two']);
    });
  });

  describe('runExternalCallbacks', () => {
    let context: ReturnType<typeof xpackMocks.createRequestHandlerContext>;
    let request: KibanaRequest;

    const newPackagePolicy = {
      policy_id: 'a5ca00c0-b30c-11ea-9732-1bb05811278c',
      description: '',
      enabled: true,
      inputs: [],
      name: 'endpoint-1',
      namespace: 'default',
      output_id: '',
      package: {
        name: 'endpoint',
        title: 'Elastic Endpoint',
        version: '0.5.0',
      },
    };

    const callbackCallingOrder: string[] = [];

    // Callback one adds an input that includes a `config` property
    const callbackOne: CombinedExternalCallback = jest.fn(async (ds) => {
      callbackCallingOrder.push('one');
      return {
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
    });

    // Callback two adds an additional `input[0].config` property
    const callbackTwo: CombinedExternalCallback = jest.fn(async (ds) => {
      callbackCallingOrder.push('two');
      return {
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
    });

    beforeEach(() => {
      context = xpackMocks.createRequestHandlerContext();
      request = httpServerMock.createKibanaRequest();
      appContextService.start(createAppContextStartContractMock());
    });

    afterEach(() => {
      appContextService.stop();
      jest.clearAllMocks();
      callbackCallingOrder.length = 0;
    });

    it('should call external callbacks in expected order', async () => {
      const callbackA: CombinedExternalCallback = jest.fn(async (ds) => {
        callbackCallingOrder.push('a');
        return ds;
      });

      const callbackB: CombinedExternalCallback = jest.fn(async (ds) => {
        callbackCallingOrder.push('b');
        return ds;
      });

      appContextService.addExternalCallback('packagePolicyCreate', callbackA);
      appContextService.addExternalCallback('packagePolicyCreate', callbackB);

      await packagePolicyService.runExternalCallbacks(
        'packagePolicyCreate',
        newPackagePolicy,
        context,
        request
      );
      expect(callbackCallingOrder).toEqual(['a', 'b']);
    });

    it('should feed package policy returned by last callback', async () => {
      appContextService.addExternalCallback('packagePolicyCreate', callbackOne);
      appContextService.addExternalCallback('packagePolicyCreate', callbackTwo);

      await packagePolicyService.runExternalCallbacks(
        'packagePolicyCreate',
        newPackagePolicy,
        context,
        request
      );

      expect((callbackOne as jest.Mock).mock.calls[0][0].inputs).toHaveLength(0);
      expect((callbackTwo as jest.Mock).mock.calls[0][0].inputs).toHaveLength(1);
      expect((callbackTwo as jest.Mock).mock.calls[0][0].inputs[0].config.one.value).toEqual(
        'inserted by callbackOne'
      );
    });

    describe('with a callback that throws an exception', () => {
      const callbackThree: CombinedExternalCallback = jest.fn(async () => {
        callbackCallingOrder.push('three');
        throw new Error('callbackThree threw error on purpose');
      });

      const callbackFour: CombinedExternalCallback = jest.fn(async (ds) => {
        callbackCallingOrder.push('four');
        return {
          ...ds,
          inputs: [
            {
              ...ds.inputs[0],
              config: {
                ...ds.inputs[0].config,
                four: {
                  value: 'inserted by callbackFour',
                },
              },
            },
          ],
        };
      });

      beforeEach(() => {
        appContextService.addExternalCallback('packagePolicyCreate', callbackOne);
        appContextService.addExternalCallback('packagePolicyCreate', callbackTwo);
        appContextService.addExternalCallback('packagePolicyCreate', callbackThree);
        appContextService.addExternalCallback('packagePolicyCreate', callbackFour);
      });

      it('should fail to execute remaining callbacks after a callback exception', async () => {
        try {
          await packagePolicyService.runExternalCallbacks(
            'packagePolicyCreate',
            newPackagePolicy,
            context,
            request
          );
        } catch (e) {
          // expecting an error
        }

        expect(callbackCallingOrder).toEqual(['one', 'two', 'three']);
        expect((callbackOne as jest.Mock).mock.calls.length).toBe(1);
        expect((callbackTwo as jest.Mock).mock.calls.length).toBe(1);
        expect((callbackThree as jest.Mock).mock.calls.length).toBe(1);
        expect((callbackFour as jest.Mock).mock.calls.length).toBe(0);
      });

      it('should fail to return the package policy', async () => {
        expect(
          packagePolicyService.runExternalCallbacks(
            'packagePolicyCreate',
            newPackagePolicy,
            context,
            request
          )
        ).rejects.toThrow('callbackThree threw error on purpose');
      });
    });
  });

  describe('overridePackageInputs', () => {
    describe('when variable is already defined', () => {
      it('preserves original variable value without overwriting', () => {
        const basePackagePolicy: NewPackagePolicy = {
          name: 'base-package-policy',
          description: 'Base Package Policy',
          namespace: 'default',
          enabled: true,
          policy_id: 'xxxx',
          output_id: 'xxxx',
          package: {
            name: 'test-package',
            title: 'Test Package',
            version: '0.0.1',
          },
          inputs: [
            {
              type: 'logs',
              policy_template: 'template_1',
              enabled: true,
              vars: {
                path: {
                  type: 'text',
                  value: ['/var/log/logfile.log'],
                },
              },
              streams: [],
            },
          ],
        };

        const packageInfo: PackageInfo = {
          name: 'test-package',
          description: 'Test Package',
          title: 'Test Package',
          version: '0.0.1',
          latestVersion: '0.0.1',
          release: 'experimental',
          format_version: '1.0.0',
          owner: { github: 'elastic/fleet' },
          policy_templates: [
            {
              name: 'template_1',
              title: 'Template 1',
              description: 'Template 1',
              inputs: [
                {
                  type: 'logs',
                  title: 'Log',
                  description: 'Log Input',
                  vars: [
                    {
                      name: 'path',
                      type: 'text',
                    },
                  ],
                },
              ],
            },
          ],
          // @ts-ignore
          assets: {},
        };

        const inputsOverride: NewPackagePolicyInput[] = [
          {
            type: 'logs',
            enabled: true,
            streams: [],
            vars: {
              path: {
                type: 'text',
                value: '/var/log/new-logfile.log',
              },
            },
          },
        ];

        const result = overridePackageInputs(
          basePackagePolicy,
          packageInfo,
          // TODO: Update this type assertion when the `InputsOverride` type is updated such
          // that it no longer causes unresolvable type errors when used directly
          inputsOverride as InputsOverride[],
          false
        );
        expect(result.inputs[0]?.vars?.path.value).toEqual(['/var/log/logfile.log']);
      });
    });

    describe('when variable is undefined in original object', () => {
      it('adds the variable definition to the resulting object', () => {
        const basePackagePolicy: NewPackagePolicy = {
          name: 'base-package-policy',
          description: 'Base Package Policy',
          namespace: 'default',
          enabled: true,
          policy_id: 'xxxx',
          output_id: 'xxxx',
          package: {
            name: 'test-package',
            title: 'Test Package',
            version: '0.0.1',
          },
          inputs: [
            {
              type: 'logs',
              policy_template: 'template_1',
              enabled: true,
              vars: {
                path: {
                  type: 'text',
                  value: ['/var/log/logfile.log'],
                },
              },
              streams: [],
            },
          ],
        };

        const packageInfo: PackageInfo = {
          name: 'test-package',
          description: 'Test Package',
          title: 'Test Package',
          version: '0.0.1',
          latestVersion: '0.0.1',
          release: 'experimental',
          format_version: '1.0.0',
          owner: { github: 'elastic/fleet' },
          policy_templates: [
            {
              name: 'template_1',
              title: 'Template 1',
              description: 'Template 1',
              inputs: [
                {
                  type: 'logs',
                  title: 'Log',
                  description: 'Log Input',
                  vars: [
                    {
                      name: 'path',
                      type: 'text',
                    },
                    {
                      name: 'path_2',
                      type: 'text',
                    },
                  ],
                },
              ],
            },
          ],
          // @ts-ignore
          assets: {},
        };

        const inputsOverride: NewPackagePolicyInput[] = [
          {
            type: 'logs',
            enabled: true,
            streams: [],
            policy_template: 'template_1',
            vars: {
              path: {
                type: 'text',
                value: '/var/log/new-logfile.log',
              },
              path_2: {
                type: 'text',
                value: '/var/log/custom.log',
              },
            },
          },
        ];

        const result = overridePackageInputs(
          basePackagePolicy,
          packageInfo,
          // TODO: Update this type assertion when the `InputsOverride` type is updated such
          // that it no longer causes unresolvable type errors when used directly
          inputsOverride as InputsOverride[],
          false
        );

        expect(result.inputs[0]?.vars?.path_2.value).toEqual('/var/log/custom.log');
      });
    });

    describe('when variable is undefined in original object and policy_template is undefined', () => {
      it('adds the variable definition to the resulting object', () => {
        const basePackagePolicy: NewPackagePolicy = {
          name: 'base-package-policy',
          description: 'Base Package Policy',
          namespace: 'default',
          enabled: true,
          policy_id: 'xxxx',
          output_id: 'xxxx',
          package: {
            name: 'test-package',
            title: 'Test Package',
            version: '0.0.1',
          },
          inputs: [
            {
              type: 'logs',
              policy_template: 'template_1',
              enabled: true,
              vars: {
                path: {
                  type: 'text',
                  value: ['/var/log/logfile.log'],
                },
              },
              streams: [],
            },
          ],
        };

        const packageInfo: PackageInfo = {
          name: 'test-package',
          description: 'Test Package',
          title: 'Test Package',
          version: '0.0.1',
          latestVersion: '0.0.1',
          release: 'experimental',
          format_version: '1.0.0',
          owner: { github: 'elastic/fleet' },
          policy_templates: [
            {
              name: 'template_1',
              title: 'Template 1',
              description: 'Template 1',
              inputs: [
                {
                  type: 'logs',
                  title: 'Log',
                  description: 'Log Input',
                  vars: [
                    {
                      name: 'path',
                      type: 'text',
                    },
                    {
                      name: 'path_2',
                      type: 'text',
                    },
                  ],
                },
              ],
            },
          ],
          // @ts-ignore
          assets: {},
        };

        const inputsOverride: NewPackagePolicyInput[] = [
          {
            type: 'logs',
            enabled: true,
            streams: [],
            policy_template: undefined, // preconfigured input overrides don't have a policy_template
            vars: {
              path: {
                type: 'text',
                value: '/var/log/new-logfile.log',
              },
              path_2: {
                type: 'text',
                value: '/var/log/custom.log',
              },
            },
          },
        ];

        const result = overridePackageInputs(
          basePackagePolicy,
          packageInfo,
          // TODO: Update this type assertion when the `InputsOverride` type is updated such
          // that it no longer causes unresolvable type errors when used directly
          inputsOverride as InputsOverride[],
          false
        );

        expect(result.inputs[0]?.vars?.path_2.value).toEqual('/var/log/custom.log');
      });
    });

    describe('when an input of the same type exists under multiple policy templates', () => {
      it('adds variable definitions to the proper streams', () => {
        const basePackagePolicy: NewPackagePolicy = {
          name: 'base-package-policy',
          description: 'Base Package Policy',
          namespace: 'default',
          enabled: true,
          policy_id: 'xxxx',
          output_id: 'xxxx',
          package: {
            name: 'test-package',
            title: 'Test Package',
            version: '0.0.1',
          },
          inputs: [
            {
              type: 'logs',
              policy_template: 'template_1',
              enabled: true,
              streams: [
                {
                  enabled: true,
                  data_stream: {
                    dataset: 'test.logs',
                    type: 'logfile',
                  },
                  vars: {
                    log_file_path: {
                      type: 'text',
                    },
                  },
                },
              ],
            },
            {
              type: 'logs',
              policy_template: 'template_2',
              enabled: true,
              streams: [
                {
                  enabled: true,
                  data_stream: {
                    dataset: 'test.logs',
                    type: 'logfile',
                  },
                  vars: {
                    log_file_path: {
                      type: 'text',
                    },
                  },
                },
              ],
            },
          ],
        };

        const packageInfo: PackageInfo = {
          name: 'test-package',
          description: 'Test Package',
          title: 'Test Package',
          version: '0.0.1',
          latestVersion: '0.0.1',
          release: 'experimental',
          format_version: '1.0.0',
          owner: { github: 'elastic/fleet' },
          policy_templates: [
            {
              name: 'template_1',
              title: 'Template 1',
              description: 'Template 1',
              inputs: [
                {
                  type: 'logs',
                  title: 'Log',
                  description: 'Log Input',
                  vars: [],
                },
              ],
            },
            {
              name: 'template_2',
              title: 'Template 2',
              description: 'Template 2',
              inputs: [
                {
                  type: 'logs',
                  title: 'Log',
                  description: 'Log Input',
                  vars: [],
                },
              ],
            },
          ],
          // @ts-ignore
          assets: {},
        };

        const inputsOverride: NewPackagePolicyInput[] = [
          {
            type: 'logs',
            enabled: true,
            policy_template: 'template_1',
            streams: [
              {
                enabled: true,
                data_stream: {
                  dataset: 'test.logs',
                  type: 'logfile',
                },
                vars: {
                  log_file_path: {
                    type: 'text',
                    value: '/var/log/template1-logfile.log',
                  },
                },
              },
            ],
          },
          {
            type: 'logs',
            enabled: true,
            policy_template: 'template_2',
            streams: [
              {
                enabled: true,
                data_stream: {
                  dataset: 'test.logs',
                  type: 'logfile',
                },
                vars: {
                  log_file_path: {
                    type: 'text',
                    value: '/var/log/template2-logfile.log',
                  },
                },
              },
            ],
          },
        ];

        const result = overridePackageInputs(
          basePackagePolicy,
          packageInfo,
          // TODO: Update this type assertion when the `InputsOverride` type is updated such
          // that it no longer causes unresolvable type errors when used directly
          inputsOverride as InputsOverride[],
          false
        );

        expect(result.inputs).toHaveLength(2);

        const template1Input = result.inputs.find(
          (input) => input.policy_template === 'template_1'
        );
        const template2Input = result.inputs.find(
          (input) => input.policy_template === 'template_2'
        );

        expect(template1Input).toBeDefined();
        expect(template2Input).toBeDefined();

        expect(template1Input?.streams[0].vars?.log_file_path.value).toBe(
          '/var/log/template1-logfile.log'
        );

        expect(template2Input?.streams[0].vars?.log_file_path.value).toBe(
          '/var/log/template2-logfile.log'
        );
      });
    });

    describe('when an input or stream is disabled on the original policy object', () => {
      it('remains disabled on the resulting policy object', () => {
        const basePackagePolicy: NewPackagePolicy = {
          name: 'base-package-policy',
          description: 'Base Package Policy',
          namespace: 'default',
          enabled: true,
          policy_id: 'xxxx',
          output_id: 'xxxx',
          package: {
            name: 'test-package',
            title: 'Test Package',
            version: '0.0.1',
          },
          inputs: [
            {
              type: 'logs',
              policy_template: 'template_1',
              enabled: false,
              streams: [
                {
                  enabled: false,
                  data_stream: {
                    dataset: 'test.logs',
                    type: 'logfile',
                  },
                  vars: {
                    log_file_path: {
                      type: 'text',
                    },
                  },
                },
                {
                  enabled: true,
                  data_stream: {
                    dataset: 'test.logs',
                    type: 'logfile2',
                  },
                  vars: {
                    log_file_path_2: {
                      type: 'text',
                    },
                  },
                },
              ],
            },
            {
              type: 'logs_2',
              policy_template: 'template_1',
              enabled: true,
              streams: [
                {
                  enabled: true,
                  data_stream: {
                    dataset: 'test.logs',
                    type: 'logfile',
                  },
                  vars: {
                    log_file_path: {
                      type: 'text',
                    },
                  },
                },
              ],
            },
            {
              type: 'logs',
              policy_template: 'template_2',
              enabled: true,
              streams: [
                {
                  enabled: true,
                  data_stream: {
                    dataset: 'test.logs',
                    type: 'logfile',
                  },
                  vars: {
                    log_file_path: {
                      type: 'text',
                    },
                  },
                },
              ],
            },
          ],
        };

        const packageInfo: PackageInfo = {
          name: 'test-package',
          description: 'Test Package',
          title: 'Test Package',
          version: '0.0.1',
          latestVersion: '0.0.1',
          release: 'experimental',
          format_version: '1.0.0',
          owner: { github: 'elastic/fleet' },
          policy_templates: [
            {
              name: 'template_1',
              title: 'Template 1',
              description: 'Template 1',
              inputs: [
                {
                  type: 'logs',
                  title: 'Log',
                  description: 'Log Input',
                  vars: [],
                },
                {
                  type: 'logs_2',
                  title: 'Log 2',
                  description: 'Log Input 2',
                  vars: [],
                },
              ],
            },
            {
              name: 'template_2',
              title: 'Template 2',
              description: 'Template 2',
              inputs: [
                {
                  type: 'logs',
                  title: 'Log',
                  description: 'Log Input',
                  vars: [],
                },
              ],
            },
          ],
          // @ts-ignore
          assets: {},
        };

        const inputsOverride: NewPackagePolicyInput[] = [
          {
            type: 'logs',
            enabled: true,
            policy_template: 'template_1',
            streams: [
              {
                enabled: true,
                data_stream: {
                  dataset: 'test.logs',
                  type: 'logfile',
                },
                vars: {
                  log_file_path: {
                    type: 'text',
                    value: '/var/log/template1-logfile.log',
                  },
                },
              },
              {
                enabled: true,
                data_stream: {
                  dataset: 'test.logs',
                  type: 'logfile2',
                },
                vars: {
                  log_file_path_2: {
                    type: 'text',
                    value: '/var/log/template1-logfile2.log',
                  },
                },
              },
            ],
          },
          {
            type: 'logs',
            enabled: true,
            policy_template: 'template_2',
            streams: [
              {
                enabled: true,
                data_stream: {
                  dataset: 'test.logs',
                  type: 'logfile',
                },
                vars: {
                  log_file_path: {
                    type: 'text',
                    value: '/var/log/template2-logfile.log',
                  },
                },
              },
            ],
          },
        ];

        const result = overridePackageInputs(
          basePackagePolicy,
          packageInfo,
          // TODO: Update this type assertion when the `InputsOverride` type is updated such
          // that it no longer causes unresolvable type errors when used directly
          inputsOverride as InputsOverride[],
          false
        );

        const template1Inputs = result.inputs.filter(
          (input) => input.policy_template === 'template_1'
        );

        const template2Inputs = result.inputs.filter(
          (input) => input.policy_template === 'template_2'
        );

        expect(template1Inputs).toHaveLength(2);
        expect(template2Inputs).toHaveLength(1);

        const logsInput = template1Inputs?.find((input) => input.type === 'logs');
        expect(logsInput?.enabled).toBe(false);

        const logfileStream = logsInput?.streams.find(
          (stream) => stream.data_stream.type === 'logfile'
        );

        expect(logfileStream?.enabled).toBe(false);
      });
    });
  });
});

describe('_applyIndexPrivileges()', () => {
  function createPackageStream(indexPrivileges?: string[]): RegistryDataStream {
    const stream: RegistryDataStream = {
      type: '',
      dataset: '',
      title: '',
      release: '',
      package: '',
      path: '',
    };

    if (indexPrivileges) {
      stream.elasticsearch = {
        privileges: {
          indices: indexPrivileges,
        },
      };
    }

    return stream;
  }

  function createInputStream(
    opts: Partial<PackagePolicyInputStream> = {}
  ): PackagePolicyInputStream {
    return {
      id: '',
      enabled: true,
      data_stream: {
        dataset: '',
        type: '',
      },
      ...opts,
    };
  }

  beforeAll(async () => {
    appContextService.start(createAppContextStartContractMock());
  });

  it('should do nothing if packageStream has no privileges', () => {
    const packageStream = createPackageStream();
    const inputStream = createInputStream();

    const streamOut = _applyIndexPrivileges(packageStream, inputStream);
    expect(streamOut).toEqual(inputStream);
  });

  it('should not apply privileges if all privileges are forbidden', () => {
    const forbiddenPrivileges = ['write', 'delete', 'delete_index', 'all'];
    const packageStream = createPackageStream(forbiddenPrivileges);
    const inputStream = createInputStream();

    const streamOut = _applyIndexPrivileges(packageStream, inputStream);
    expect(streamOut).toEqual(inputStream);
  });

  it('should not apply privileges if all privileges are unrecognized', () => {
    const unrecognizedPrivileges = ['idnotexist', 'invalidperm'];
    const packageStream = createPackageStream(unrecognizedPrivileges);
    const inputStream = createInputStream();

    const streamOut = _applyIndexPrivileges(packageStream, inputStream);
    expect(streamOut).toEqual(inputStream);
  });

  it('should apply privileges if all privileges are valid', () => {
    const validPrivileges = [
      'auto_configure',
      'create_doc',
      'maintenance',
      'monitor',
      'read',
      'read_cross_cluster',
    ];

    const packageStream = createPackageStream(validPrivileges);
    const inputStream = createInputStream();
    const expectedStream = {
      ...inputStream,
      data_stream: {
        ...inputStream.data_stream,
        elasticsearch: {
          privileges: {
            indices: validPrivileges,
          },
        },
      },
    };

    const streamOut = _applyIndexPrivileges(packageStream, inputStream);
    expect(streamOut).toEqual(expectedStream);
  });

  it('should only apply valid privileges when there is a  mix of valid and invalid', () => {
    const mixedPrivileges = ['auto_configure', 'read_cross_cluster', 'idontexist', 'delete'];

    const packageStream = createPackageStream(mixedPrivileges);
    const inputStream = createInputStream();
    const expectedStream = {
      ...inputStream,
      data_stream: {
        ...inputStream.data_stream,
        elasticsearch: {
          privileges: {
            indices: ['auto_configure', 'read_cross_cluster'],
          },
        },
      },
    };

    const streamOut = _applyIndexPrivileges(packageStream, inputStream);
    expect(streamOut).toEqual(expectedStream);
  });
});
