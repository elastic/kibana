/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { savedObjectsClientMock } from 'src/core/server/mocks';
import { createPackageConfigMock } from '../../common/mocks';
import { packageConfigService } from './package_config';
import { PackageInfo, PackageConfigSOAttributes } from '../types';
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
  return [];
}

jest.mock('./epm/packages/assets', () => {
  return {
    getAssetsData: mockedGetAssetsData,
  };
});

jest.mock('./epm/registry', () => {
  return {
    fetchInfo: () => ({}),
  };
});

describe('Package config service', () => {
  describe('assignPackageStream', () => {
    it('should work with config variables from the stream', async () => {
      const inputs = await packageConfigService.assignPackageStream(
        ({
          datasets: [
            {
              type: 'logs',
              name: 'package.dataset1',
              streams: [{ input: 'log', template_path: 'some_template_path.yml' }],
            },
          ],
          config_templates: [
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
                id: 'dataset01',
                dataset: { name: 'package.dataset1', type: 'logs' },
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
              id: 'dataset01',
              dataset: { name: 'package.dataset1', type: 'logs' },
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
      const inputs = await packageConfigService.assignPackageStream(
        ({
          datasets: [
            {
              name: 'package.dataset1',
              type: 'logs',
              streams: [{ input: 'log', template_path: 'some_template_path.yml' }],
            },
          ],
          config_templates: [
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
                id: 'dataset01',
                dataset: { name: 'package.dataset1', type: 'logs' },
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
              id: 'dataset01',
              dataset: { name: 'package.dataset1', type: 'logs' },
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
        attributes: createPackageConfigMock(),
      });
      savedObjectsClient.update.mockImplementation(
        async (
          type: string,
          id: string
        ): Promise<SavedObjectsUpdateResponse<PackageConfigSOAttributes>> => {
          throw savedObjectsClient.errors.createConflictError('abc', '123');
        }
      );
      await expect(
        packageConfigService.update(
          savedObjectsClient,
          'the-package-config-id',
          createPackageConfigMock()
        )
      ).rejects.toThrow('Saved object [abc/123] conflict');
    });
  });
});
