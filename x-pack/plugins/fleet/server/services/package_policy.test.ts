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
  coreMock,
} from '@kbn/core/server/mocks';
import { produce } from 'immer';
import type {
  SavedObjectsClient,
  SavedObjectsClientContract,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core/server';

import type {
  PackageInfo,
  PackagePolicySOAttributes,
  AgentPolicySOAttributes,
  PostPackagePolicyDeleteCallback,
  RegistryDataStream,
  PackagePolicyInputStream,
  PackagePolicy,
  PostPackagePolicyPostCreateCallback,
} from '../types';
import { createPackagePolicyMock } from '../../common/mocks';

import type { PutPackagePolicyUpdateCallback, PostPackagePolicyCreateCallback } from '..';

import { createAppContextStartContractMock, xpackMocks } from '../mocks';

import type {
  DeletePackagePoliciesResponse,
  InputsOverride,
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackagePolicyPackage,
} from '../../common';
import { packageToPackagePolicy } from '../../common';

import { IngestManagerError, PackagePolicyIneligibleForUpgradeError } from '../errors';

import {
  preconfigurePackageInputs,
  updatePackageInputs,
  packagePolicyService,
  _applyIndexPrivileges,
  _compilePackagePolicyInputs,
} from './package_policy';
import { appContextService } from './app_context';

import { getPackageInfo } from './epm/packages';

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

async function mockedGetInstallation(params: any) {
  let pkg;
  if (params.pkgName === 'apache') pkg = { version: '1.3.2' };
  if (params.pkgName === 'aws') pkg = { version: '0.3.3' };
  return Promise.resolve(pkg);
}

async function mockedGetPackageInfo(params: any) {
  let pkg;
  if (params.pkgName === 'apache') pkg = { version: '1.3.2' };
  if (params.pkgName === 'aws') pkg = { version: '0.3.3' };
  if (params.pkgName === 'endpoint') pkg = {};
  return Promise.resolve(pkg);
}

jest.mock('./epm/packages/assets', () => {
  return {
    getAssetsData: mockedGetAssetsData,
  };
});

jest.mock('./epm/packages', () => {
  return {
    getPackageInfo: jest.fn().mockImplementation(mockedGetPackageInfo),
    getInstallation: mockedGetInstallation,
  };
});

jest.mock('../../common', () => ({
  ...jest.requireActual('../../common'),
  packageToPackagePolicy: jest.fn(),
}));

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
      getDefaultAgentPolicyId: () => Promise.resolve('1'),
    },
  };
});

jest.mock('./epm/packages/cleanup', () => {
  return {
    removeOldAssets: jest.fn(),
  };
});

jest.mock('./upgrade_sender', () => {
  return {
    sendTelemetryEvents: jest.fn(),
  };
});

type CombinedExternalCallback = PutPackagePolicyUpdateCallback | PostPackagePolicyCreateCallback;

describe('Package policy service', () => {
  describe('_compilePackagePolicyInputs', () => {
    it('should work with config variables from the stream', async () => {
      const inputs = await _compilePackagePolicyInputs(
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
      const inputs = await _compilePackagePolicyInputs(
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
      const inputs = await _compilePackagePolicyInputs(
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
      const inputs = await _compilePackagePolicyInputs(
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
      const inputs = await _compilePackagePolicyInputs(
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
      const inputs = await _compilePackagePolicyInputs(
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
      const inputs = await _compilePackagePolicyInputs(
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
      const inputs = await _compilePackagePolicyInputs(
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
    beforeEach(() => {
      appContextService.start(createAppContextStartContractMock());
    });
    afterEach(() => {
      appContextService.stop();
    });
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

    it('should throw if the user try to update input vars that are frozen', async () => {
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

      const res = packagePolicyService.update(
        savedObjectsClient,
        elasticsearchClient,
        'the-package-policy-id',
        { ...mockPackagePolicy, inputs: inputsUpdate }
      );

      await expect(res).rejects.toThrow('cat is a frozen variable and cannot be modified');
    });

    it('should allow to update input vars that are frozen with the force flag', async () => {
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
        { ...mockPackagePolicy, inputs: inputsUpdate },
        { force: true }
      );

      const [modifiedInput] = result.inputs;
      expect(modifiedInput.enabled).toEqual(true);
      expect(modifiedInput.vars!.dog.value).toEqual('labrador');
      expect(modifiedInput.vars!.cat.value).toEqual('tabby');
      const [modifiedStream] = modifiedInput.streams;
      expect(modifiedStream.vars!.paths.value).toEqual(expect.arrayContaining(['east', 'west']));
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
              value: 'siamese',
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
      (getPackageInfo as jest.Mock).mockImplementation(async (params) => {
        return Promise.resolve({
          ...(await mockedGetPackageInfo(params)),
          elasticsearch: {
            privileges: {
              cluster: ['monitor'],
            },
          },
        } as PackageInfo);
      });

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

    it('should not mutate packagePolicyUpdate object when trimming whitespace', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      const mockPackagePolicy = createPackagePolicyMock();

      const attributes = {
        ...mockPackagePolicy,
        inputs: [],
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
        // this mimics the way that OSQuery plugin create immutable objects
        produce<PackagePolicy>(
          { ...mockPackagePolicy, name: '  test  ', inputs: [] },
          (draft) => draft
        )
      );

      expect(result.name).toEqual('test');
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
        coreMock.createCustomRequestHandlerContext(context),
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
        coreMock.createCustomRequestHandlerContext(context),
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
            coreMock.createCustomRequestHandlerContext(context),
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
            coreMock.createCustomRequestHandlerContext(context),
            request
          )
        ).rejects.toThrow('callbackThree threw error on purpose');
      });
    });
  });

  describe('runPostPackagePolicyPostCreateCallback', () => {
    let context: ReturnType<typeof xpackMocks.createRequestHandlerContext>;
    let request: KibanaRequest;
    const packagePolicy = {
      id: '93ac25fe-0467-4fcc-a3c5-57a26a8496e2',
      version: 'WzYyMzcsMV0=',
      name: 'my-cis_kubernetes_benchmark',
      namespace: 'default',
      description: '',
      package: {
        name: 'cis_kubernetes_benchmark',
        title: 'CIS Kubernetes Benchmark',
        version: '0.0.3',
      },
      enabled: true,
      policy_id: '1e6d0690-b995-11ec-a355-d35391e25881',
      output_id: '',
      inputs: [
        {
          type: 'cloudbeat',
          policy_template: 'findings',
          enabled: true,
          streams: [
            {
              enabled: true,
              data_stream: {
                type: 'logs',
                dataset: 'cis_kubernetes_benchmark.findings',
              },
              id: 'cloudbeat-cis_kubernetes_benchmark.findings-66b402b3-f24a-4018-b3d0-b88582a836ab',
              compiled_stream: {
                processors: [
                  {
                    add_cluster_id: null,
                  },
                ],
              },
            },
          ],
        },
      ],
      vars: {
        dataYaml: {
          type: 'yaml',
        },
      },
      elasticsearch: undefined,
      revision: 1,
      created_at: '2022-04-11T12:44:43.385Z',
      created_by: 'elastic',
      updated_at: '2022-04-11T12:44:43.385Z',
      updated_by: 'elastic',
    };
    const callbackCallingOrder: string[] = [];

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

    it('should execute PostPackagePolicyPostCreateCallback external callbacks', async () => {
      const callbackA: PostPackagePolicyPostCreateCallback = jest.fn(async (ds) => {
        callbackCallingOrder.push('a');
        return ds;
      });

      const callbackB: PostPackagePolicyPostCreateCallback = jest.fn(async (ds) => {
        callbackCallingOrder.push('b');
        return ds;
      });

      appContextService.addExternalCallback('packagePolicyPostCreate', callbackA);
      appContextService.addExternalCallback('packagePolicyPostCreate', callbackB);

      await packagePolicyService.runExternalCallbacks(
        'packagePolicyPostCreate',
        packagePolicy,
        coreMock.createCustomRequestHandlerContext(context),
        request
      );

      expect(callbackA).toHaveBeenCalledWith(packagePolicy, context, request);
      expect(callbackB).toHaveBeenCalledWith(packagePolicy, context, request);
      expect(callbackCallingOrder).toEqual(['a', 'b']);
    });
  });

  describe('preconfigurePackageInputs', () => {
    describe('when variable is already defined', () => {
      it('override original variable value', () => {
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

        const result = preconfigurePackageInputs(
          basePackagePolicy,
          packageInfo,
          // TODO: Update this type assertion when the `InputsOverride` type is updated such
          // that it no longer causes unresolvable type errors when used directly
          inputsOverride as InputsOverride[]
        );
        expect(result.inputs[0]?.vars?.path.value).toEqual('/var/log/new-logfile.log');
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

        const result = preconfigurePackageInputs(
          basePackagePolicy,
          packageInfo,
          // TODO: Update this type assertion when the `InputsOverride` type is updated such
          // that it no longer causes unresolvable type errors when used directly
          inputsOverride as InputsOverride[]
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

        const result = preconfigurePackageInputs(
          basePackagePolicy,
          packageInfo,
          // TODO: Update this type assertion when the `InputsOverride` type is updated such
          // that it no longer causes unresolvable type errors when used directly
          inputsOverride as InputsOverride[]
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

        const result = preconfigurePackageInputs(
          basePackagePolicy,
          packageInfo,
          // TODO: Update this type assertion when the `InputsOverride` type is updated such
          // that it no longer causes unresolvable type errors when used directly
          inputsOverride as InputsOverride[]
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

    describe('when an input or stream is disabled by default in the package', () => {
      it('allow preconfiguration to enable it', () => {
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

        const result = preconfigurePackageInputs(
          basePackagePolicy,
          packageInfo,
          // TODO: Update this type assertion when the `InputsOverride` type is updated such
          // that it no longer causes unresolvable type errors when used directly
          inputsOverride as InputsOverride[]
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
        expect(logsInput?.enabled).toBe(true);

        const logfileStream = logsInput?.streams.find(
          (stream) => stream.data_stream.type === 'logfile'
        );

        expect(logfileStream?.enabled).toBe(true);
      });
    });

    describe('when a datastream is deleted from an input', () => {
      it('it remove the non existing datastream', () => {
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
              streams: [
                {
                  enabled: true,
                  data_stream: { dataset: 'dataset.test123', type: 'log' },
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

        const result = preconfigurePackageInputs(
          basePackagePolicy,
          packageInfo,
          // TODO: Update this type assertion when the `InputsOverride` type is updated such
          // that it no longer causes unresolvable type errors when used directly
          inputsOverride as InputsOverride[]
        );
        expect(result.inputs[0]?.vars?.path.value).toEqual('/var/log/new-logfile.log');
      });
    });
  });

  describe('updatePackageInputs', () => {
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
                is_value_enabled: {
                  type: 'bool',
                  value: false,
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
                      name: 'is_value_enabled',
                      type: 'bool',
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
              is_value_enabled: {
                type: 'bool',
                value: 'true',
              },
            },
          },
        ];

        const result = updatePackageInputs(
          basePackagePolicy,
          packageInfo,
          // TODO: Update this type assertion when the `InputsOverride` type is updated such
          // that it no longer causes unresolvable type errors when used directly
          inputsOverride as InputsOverride[],
          false
        );
        expect(result.inputs[0]?.vars?.path.value).toEqual(['/var/log/logfile.log']);
        expect(result.inputs[0]?.vars?.is_value_enabled.value).toEqual(false);
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

        const result = updatePackageInputs(
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

        const result = updatePackageInputs(
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

        const result = updatePackageInputs(
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

        const result = updatePackageInputs(
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

    describe('when a datastream is deleted from an input', () => {
      it('it remove the non existing datastream', () => {
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
              streams: [
                {
                  enabled: true,
                  data_stream: { dataset: 'dataset.test123', type: 'log' },
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

        const result = updatePackageInputs(
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

    describe('when policy_template is defined on update, but undefined on existing input with matching type', () => {
      it('generates the proper inputs, and adds a policy_template field', () => {
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

        const result = updatePackageInputs(
          basePackagePolicy,
          packageInfo,
          // TODO: Update this type assertion when the `InputsOverride` type is updated such
          // that it no longer causes unresolvable type errors when used directly
          inputsOverride as InputsOverride[],
          false
        );

        expect(result.inputs.length).toBe(1);
        expect(result.inputs[0]?.vars?.path.value).toEqual(['/var/log/logfile.log']);
        expect(result.inputs[0]?.vars?.path_2.value).toBe('/var/log/custom.log');
        expect(result.inputs[0]?.policy_template).toBe('template_1');
      });
    });
  });

  describe('enrich package policy on create', () => {
    beforeEach(() => {
      (packageToPackagePolicy as jest.Mock).mockReturnValue({
        package: { name: 'apache', title: 'Apache', version: '1.0.0' },
        inputs: [
          {
            type: 'logfile',
            policy_template: 'log',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: {
                  type: 'logs',
                  dataset: 'apache.access',
                },
              },
            ],
          },
        ],
        vars: {
          paths: {
            value: ['/var/log/apache2/access.log*'],
            type: 'text',
          },
        },
      });
    });

    it('should enrich from epm with defaults', async () => {
      const newPolicy = {
        name: 'apache-1',
        inputs: [{ type: 'logfile', enabled: false }],
        package: { name: 'apache', version: '0.3.3' },
        policy_id: '1',
      } as NewPackagePolicy;
      const result = await packagePolicyService.enrichPolicyWithDefaultsFromPackage(
        savedObjectsClientMock.create(),
        newPolicy
      );
      expect(result).toEqual({
        name: 'apache-1',
        namespace: 'default',
        description: '',
        package: { name: 'apache', title: 'Apache', version: '1.0.0' },
        enabled: true,
        policy_id: '1',
        output_id: '',
        inputs: [
          {
            enabled: false,
            type: 'logfile',
            policy_template: 'log',
            streams: [
              {
                enabled: false,
                data_stream: {
                  type: 'logs',
                  dataset: 'apache.access',
                },
              },
            ],
          },
        ],
        vars: {
          paths: {
            value: ['/var/log/apache2/access.log*'],
            type: 'text',
          },
        },
      });
    });

    it('should enrich from epm with defaults using policy template', async () => {
      (packageToPackagePolicy as jest.Mock).mockReturnValueOnce({
        package: { name: 'aws', title: 'AWS', version: '1.0.0' },
        inputs: [
          {
            type: 'aws/metrics',
            policy_template: 'cloudtrail',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: {
                  type: 'metrics',
                  dataset: 'cloudtrail',
                },
              },
            ],
          },
          {
            type: 'aws/metrics',
            policy_template: 'cloudwatch',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: {
                  type: 'metrics',
                  dataset: 'cloudwatch',
                },
              },
            ],
          },
        ],
      });
      const newPolicy = {
        name: 'aws-1',
        inputs: [{ type: 'aws/metrics', policy_template: 'cloudwatch', enabled: true }],
        package: { name: 'aws', version: '1.0.0' },
        policy_id: '1',
      } as NewPackagePolicy;
      const result = await packagePolicyService.enrichPolicyWithDefaultsFromPackage(
        savedObjectsClientMock.create(),
        newPolicy
      );
      expect(result).toEqual({
        name: 'aws-1',
        namespace: 'default',
        description: '',
        package: { name: 'aws', title: 'AWS', version: '1.0.0' },
        enabled: true,
        policy_id: '1',
        output_id: '',
        inputs: [
          {
            type: 'aws/metrics',
            policy_template: 'cloudwatch',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: {
                  type: 'metrics',
                  dataset: 'cloudwatch',
                },
              },
            ],
          },
        ],
      });
    });

    it('should override defaults with new values', async () => {
      const newPolicy = {
        name: 'apache-2',
        namespace: 'namespace',
        description: 'desc',
        enabled: false,
        policy_id: '2',
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
                  dataset: 'apache.error',
                },
              },
            ],
          },
        ],
        vars: {
          paths: {
            value: ['/my/access.log*'],
            type: 'text',
          },
        },
        package: { name: 'apache', version: '1.0.0' } as PackagePolicyPackage,
      } as NewPackagePolicy;
      const result = await packagePolicyService.enrichPolicyWithDefaultsFromPackage(
        savedObjectsClientMock.create(),
        newPolicy
      );
      expect(result).toEqual({
        name: 'apache-2',
        namespace: 'namespace',
        description: 'desc',
        package: { name: 'apache', title: 'Apache', version: '1.0.0' },
        enabled: false,
        policy_id: '2',
        output_id: '3',
        inputs: [
          {
            enabled: true,
            type: 'logfile',
            streams: [
              {
                enabled: true,
                data_stream: {
                  type: 'logs',
                  dataset: 'apache.error',
                },
              },
            ],
          },
        ],
        vars: {
          paths: {
            value: ['/my/access.log*'],
            type: 'text',
          },
        },
      });
    });
  });

  describe('upgrade package policy info', () => {
    let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
    beforeEach(() => {
      savedObjectsClient = savedObjectsClientMock.create();
    });

    function mockPackage(pkgName: string) {
      const mockPackagePolicy = createPackagePolicyMock();

      const attributes = {
        ...mockPackagePolicy,
        inputs: [],
        package: {
          ...mockPackagePolicy.package,
          name: pkgName,
        },
      };

      savedObjectsClient.get.mockResolvedValueOnce({
        id: 'package-policy-id',
        type: 'abcd',
        references: [],
        version: '1.3.2',
        attributes,
      });
    }

    it('should return success if package and policy versions match', async () => {
      mockPackage('apache');

      const response = await packagePolicyService.getUpgradePackagePolicyInfo(
        savedObjectsClient,
        'package-policy-id'
      );

      expect(response).toBeDefined();
    });

    it('should return error if package policy newer than package version', async () => {
      mockPackage('aws');

      expect(
        packagePolicyService.getUpgradePackagePolicyInfo(savedObjectsClient, 'package-policy-id')
      ).rejects.toEqual(
        new PackagePolicyIneligibleForUpgradeError(
          "Package policy c6d16e42-c32d-4dce-8a88-113cfe276ad1's package version 0.9.0 of package aws is newer than the installed package version. Please install the latest version of aws."
        )
      );
    });

    it('should return error if package not installed', async () => {
      mockPackage('notinstalled');

      expect(
        packagePolicyService.getUpgradePackagePolicyInfo(savedObjectsClient, 'package-policy-id')
      ).rejects.toEqual(new IngestManagerError('Package notinstalled is not installed'));
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
