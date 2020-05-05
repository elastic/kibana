/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { datasourceService } from './datasource';
import { PackageInfo } from '../types';

const TEMPLATE = `
type: log
metricset: ["dataset1"]
paths:
{{#each paths}}
- {{this}}
{{/each}}
`;

describe('Datasource service', () => {
  describe('assignPackageStream', () => {
    it('should work with config variables from the stream', async () => {
      const inputs = await datasourceService.assignPackageStream(
        ({
          datasources: [
            {
              inputs: [
                {
                  type: 'log',
                  streams: [
                    {
                      dataset: 'package.dataset1',
                      template: TEMPLATE,
                    },
                  ],
                },
              ],
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
                dataset: 'package.dataset1',
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
              dataset: 'package.dataset1',
              enabled: true,
              vars: {
                paths: {
                  value: ['/var/log/set.log'],
                },
              },
              agent_stream: {
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
        ({
          datasources: [
            {
              inputs: [
                {
                  type: 'log',
                  streams: [
                    {
                      dataset: 'package.dataset1',
                      template: TEMPLATE,
                    },
                  ],
                },
              ],
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
          vars: {
            paths: {
              value: ['/var/log/set.log'],
            },
          },
          streams: [
            {
              id: 'dataset01',
              dataset: 'package.dataset1',
              enabled: true,
              agent_stream: {
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
