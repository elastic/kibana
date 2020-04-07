/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { datasourceService } from './datasource';
import { RegistryPackage } from '../types';

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

describe('Datasource service', () => {
  const pkgInfo = {} as RegistryPackage;

  describe('assignPackageStream', () => {
    it('should work', async () => {
      const inputs = await datasourceService.assignPackageStream(pkgInfo, [
        {
          type: 'log',
          enabled: true,
          streams: [
            {
              id: 'dataset01',
              dataset: 'package.dataset1',
              enabled: true,
              config: {
                paths: {
                  value: ['/var/log/set.log'],
                },
              },
            },
          ],
        },
      ]);

      expect(inputs).toEqual([
        {
          type: 'log',
          enabled: true,
          streams: [
            {
              id: 'dataset01',
              dataset: 'package.dataset1',
              enabled: true,
              config: {
                paths: {
                  value: ['/var/log/set.log'],
                },
              },
              pkg_stream: {
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
});
