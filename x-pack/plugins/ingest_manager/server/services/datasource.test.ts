/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { datasourceService } from './datasource';

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
    getAssetsDataForPackageKey: mockedGetAssetsData,
  };
});

describe('Datasource service', () => {
  describe('assignPackageStream', () => {
    it('should work with cofig variables from the stream', async () => {
      const inputs = await datasourceService.assignPackageStream(
        {
          pkgName: 'package',
          pkgVersion: '1.0.0',
        },
        [
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
        ]
      );

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

    it('should work with config variables at the input level', async () => {
      const inputs = await datasourceService.assignPackageStream(
        {
          pkgName: 'package',
          pkgVersion: '1.0.0',
        },
        [
          {
            type: 'log',
            enabled: true,
            config: {
              paths: {
                value: ['/var/log/set.log'],
              },
            },
            streams: [
              {
                id: 'dataset01',
                dataset: 'package.dataset1',
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
          config: {
            paths: {
              value: ['/var/log/set.log'],
            },
          },
          streams: [
            {
              id: 'dataset01',
              dataset: 'package.dataset1',
              enabled: true,
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
