/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { savedObjectsClientMock } from 'src/core/server/mocks';
import { createPackagePolicyMock } from '../../common/mocks';
import { packagePolicyService } from './package_policy';
import { PackageInfo, PackagePolicySOAttributes } from '../types';
import { SavedObjectsUpdateResponse } from 'src/core/server';

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

jest.mock('./epm/registry', () => {
  return {
    fetchInfo: () => ({}),
  };
});

describe('Package policy service', () => {
  describe('compilePackagePolicyInputs', () => {
    it('should work with config variables from the stream', async () => {
      const inputs = await packagePolicyService.compilePackagePolicyInputs(
        ({
          data_streams: [
            {
              type: 'logs',
              dataset: 'package.dataset1',
              streams: [{ input: 'log', template_path: 'some_template_path.yml' }],
            },
          ],
          policy_templates: [
            {
              inputs: [{ type: 'log' }],
            },
          ],
        } as unknown) as PackageInfo,
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

    it('should work with config variables at the input level', async () => {
      const inputs = await packagePolicyService.compilePackagePolicyInputs(
        ({
          data_streams: [
            {
              dataset: 'package.dataset1',
              type: 'logs',
              streams: [{ input: 'log', template_path: 'some_template_path.yml' }],
            },
          ],
          policy_templates: [
            {
              inputs: [{ type: 'log' }],
            },
          ],
        } as unknown) as PackageInfo,
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

    it('should work with an input with a template and no streams', async () => {
      const inputs = await packagePolicyService.compilePackagePolicyInputs(
        ({
          data_streams: [],
          policy_templates: [
            {
              inputs: [{ type: 'log', template_path: 'some_template_path.yml' }],
            },
          ],
        } as unknown) as PackageInfo,
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
      const inputs = await packagePolicyService.compilePackagePolicyInputs(
        ({
          data_streams: [
            {
              dataset: 'package.dataset1',
              type: 'logs',
              streams: [{ input: 'log', template_path: 'some_template_path.yml' }],
            },
          ],
          policy_templates: [
            {
              inputs: [{ type: 'log', template_path: 'some_template_path.yml' }],
            },
          ],
        } as unknown) as PackageInfo,
        [
          {
            type: 'log',
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
                type: 'log',
              },
            },
          ],
        },
      ]);
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
          type: string,
          id: string
        ): Promise<SavedObjectsUpdateResponse<PackagePolicySOAttributes>> => {
          throw savedObjectsClient.errors.createConflictError('abc', '123');
        }
      );
      await expect(
        packagePolicyService.update(
          savedObjectsClient,
          'the-package-policy-id',
          createPackagePolicyMock()
        )
      ).rejects.toThrow('Saved object [abc/123] conflict');
    });
  });
});
