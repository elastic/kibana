/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SnapshotNodeResponse } from '../../../../../../common/http_api/snapshot_api';

const snapshot: SnapshotNodeResponse = {
  nodes: [
    {
      name: 'gke-edge-oblt-edge-oblt-pool-095c801b-vhw7',
      metrics: [
        {
          name: 'rx',
          value: 2127108.8,
          max: 4417107.5,
          avg: 2301377.0314606745,
          timeseries: {
            id: 'rx',
            columns: [
              {
                name: 'timestamp',
                type: 'date',
              },
              {
                name: 'metric_0',
                type: 'number',
              },
            ],
            rows: [
              {
                timestamp: 1685576893719,
                metric_0: 912473.9,
              },
              {
                timestamp: 1685576903719,
                metric_0: 683392.1,
              },
              {
                timestamp: 1685576913719,
                metric_0: 2158282.6,
              },
              {
                timestamp: 1685576923719,
                metric_0: 818947.6,
              },
              {
                timestamp: 1685576933719,
                metric_0: 1460480.7,
              },
              {
                timestamp: 1685576943719,
                metric_0: 2127108.8,
              },
            ],
          },
        },
        {
          name: 'tx',
          value: 2738171.2,
          max: 4067125.2,
          avg: 2564825.185393259,
          timeseries: {
            id: 'tx',
            columns: [
              {
                name: 'timestamp',
                type: 'date',
              },
              {
                name: 'metric_0',
                type: 'number',
              },
            ],
            rows: [
              {
                timestamp: 1685576893719,
                metric_0: 1818826.9,
              },
              {
                timestamp: 1685576903719,
                metric_0: 1209914.3,
              },
              {
                timestamp: 1685576913719,
                metric_0: 2299457.7,
              },
              {
                timestamp: 1685576923719,
                metric_0: 1342450.5,
              },
              {
                timestamp: 1685576933719,
                metric_0: 1585313.1,
              },
              {
                timestamp: 1685576943719,
                metric_0: 2738171.2,
              },
            ],
          },
        },
        {
          name: 'user',
          value: 3.258,
          max: 3.3890000000000002,
          avg: 3.0168876404494376,
          timeseries: {
            id: 'user',
            columns: [
              {
                name: 'timestamp',
                type: 'date',
              },
              {
                name: 'metric_0',
                type: 'number',
              },
            ],
            rows: [
              {
                timestamp: 1685576893719,
                metric_0: 3.161,
              },
              {
                timestamp: 1685576903719,
                metric_0: 3.176,
              },
              {
                timestamp: 1685576913719,
                metric_0: 3.166,
              },
              {
                timestamp: 1685576923719,
                metric_0: 3.04,
              },
              {
                timestamp: 1685576933719,
                metric_0: 3.1950000000000003,
              },
              {
                timestamp: 1685576943719,
                metric_0: 3.258,
              },
            ],
          },
        },
        {
          name: 'system',
          value: 0.718,
          max: 0.926,
          avg: 0.6750786516853934,
          timeseries: {
            id: 'system',
            columns: [
              {
                name: 'timestamp',
                type: 'date',
              },
              {
                name: 'metric_0',
                type: 'number',
              },
            ],
            rows: [
              {
                timestamp: 1685576893719,
                metric_0: 0.8140000000000001,
              },
              {
                timestamp: 1685576903719,
                metric_0: 0.801,
              },
              {
                timestamp: 1685576913719,
                metric_0: 0.808,
              },
              {
                timestamp: 1685576923719,
                metric_0: 0.926,
              },
              {
                timestamp: 1685576933719,
                metric_0: 0.764,
              },
              {
                timestamp: 1685576943719,
                metric_0: 0.718,
              },
            ],
          },
        },
        {
          name: 'load1m',
          value: 26.01,
          max: 31.8,
          avg: 26.46932584269663,
          timeseries: {
            id: 'load1m',
            columns: [
              {
                name: 'timestamp',
                type: 'date',
              },
              {
                name: 'metric_0',
                type: 'number',
              },
            ],
            rows: [
              {
                timestamp: 1685576893719,
                metric_0: 27.09,
              },
              {
                timestamp: 1685576903719,
                metric_0: 27.37,
              },
              {
                timestamp: 1685576913719,
                metric_0: 26.55,
              },
              {
                timestamp: 1685576923719,
                metric_0: 27.53,
              },
              {
                timestamp: 1685576933719,
                metric_0: 25.84,
              },
              {
                timestamp: 1685576943719,
                metric_0: 26.01,
              },
            ],
          },
        },
        {
          name: 'load5m',
          value: 25.96,
          max: 28.6,
          avg: 27.136966292134826,
          timeseries: {
            id: 'load5m',
            columns: [
              {
                name: 'timestamp',
                type: 'date',
              },
              {
                name: 'metric_0',
                type: 'number',
              },
            ],
            rows: [
              {
                timestamp: 1685576893719,
                metric_0: 26.060000000000002,
              },
              {
                timestamp: 1685576903719,
                metric_0: 26.16,
              },
              {
                timestamp: 1685576913719,
                metric_0: 26.02,
              },
              {
                timestamp: 1685576923719,
                metric_0: 26.25,
              },
              {
                timestamp: 1685576933719,
                metric_0: 25.93,
              },
              {
                timestamp: 1685576943719,
                metric_0: 25.96,
              },
            ],
          },
        },
        {
          name: 'load15m',
          value: 26.95,
          max: 28.13,
          avg: 27.625617977528083,
          timeseries: {
            id: 'load15m',
            columns: [
              {
                name: 'timestamp',
                type: 'date',
              },
              {
                name: 'metric_0',
                type: 'number',
              },
            ],
            rows: [
              {
                timestamp: 1685576893719,
                metric_0: 27.03,
              },
              {
                timestamp: 1685576903719,
                metric_0: 27.05,
              },
              {
                timestamp: 1685576913719,
                metric_0: 27,
              },
              {
                timestamp: 1685576923719,
                metric_0: 27.060000000000002,
              },
              {
                timestamp: 1685576933719,
                metric_0: 26.95,
              },
              {
                timestamp: 1685576943719,
                metric_0: 26.95,
              },
            ],
          },
        },
        {
          name: 'usedMemory',
          value: 8132767744,
          max: 8132767744,
          avg: 7119204213.932584,
          timeseries: {
            id: 'usedMemory',
            columns: [
              {
                name: 'timestamp',
                type: 'date',
              },
              {
                name: 'metric_0',
                type: 'number',
              },
            ],
            rows: [
              {
                timestamp: 1685576893719,
                metric_0: 7088345088,
              },
              {
                timestamp: 1685576903719,
                metric_0: 7522848768,
              },
              {
                timestamp: 1685576913719,
                metric_0: 7537442816,
              },
              {
                timestamp: 1685576923719,
                metric_0: 7726604288,
              },
              {
                timestamp: 1685576933719,
                metric_0: 7953211392,
              },
              {
                timestamp: 1685576943719,
                metric_0: 8132767744,
              },
            ],
          },
        },
        {
          name: 'freeMemory',
          value: 7628832768,
          max: 9116962816,
          avg: 8606769790.94532,
          timeseries: {
            id: 'freeMemory',
            columns: [
              {
                name: 'timestamp',
                type: 'date',
              },
              {
                name: 'metric_0',
                type: 'number',
              },
            ],
            rows: [
              {
                timestamp: 1685576893719,
                metric_0: 8699377664,
              },
              {
                timestamp: 1685576903719,
                metric_0: 8371572736,
              },
              {
                timestamp: 1685576913719,
                metric_0: 8148747605.333333,
              },
              {
                timestamp: 1685576923719,
                metric_0: 8098295808,
              },
              {
                timestamp: 1685576933719,
                metric_0: 7806410752,
              },
              {
                timestamp: 1685576943719,
                metric_0: 7628832768,
              },
            ],
          },
        },
        {
          name: 'cores',
          value: 4,
          max: 4,
          avg: 4,
          timeseries: {
            id: 'cores',
            columns: [
              {
                name: 'timestamp',
                type: 'date',
              },
              {
                name: 'metric_0',
                type: 'number',
              },
            ],
            rows: [
              {
                timestamp: 1685576893719,
                metric_0: 4,
              },
              {
                timestamp: 1685576903719,
                metric_0: 4,
              },
              {
                timestamp: 1685576913719,
                metric_0: 4,
              },
              {
                timestamp: 1685576923719,
                metric_0: 4,
              },
              {
                timestamp: 1685576933719,
                metric_0: 4,
              },
              {
                timestamp: 1685576943719,
                metric_0: 4,
              },
            ],
          },
        },

        {
          name: 'logRate',
          value: 1.4,
          max: 246.3,
          avg: 51.853932584269636,
          timeseries: {
            id: 'logRate',
            columns: [
              {
                name: 'timestamp',
                type: 'date',
              },
              {
                name: 'metric_0',
                type: 'number',
              },
            ],
            rows: [
              {
                timestamp: 1685576893719,
                metric_0: 195.4,
              },
              {
                timestamp: 1685576903719,
                metric_0: 33.9,
              },
              {
                timestamp: 1685576913719,
                metric_0: 1.4,
              },
              {
                timestamp: 1685576923719,
                metric_0: 218.5,
              },
              {
                timestamp: 1685576933719,
                metric_0: 1.4,
              },
              {
                timestamp: 1685576943719,
                metric_0: 1.4,
              },
            ],
          },
        },
      ],
      path: [
        {
          value: 'gke-edge-oblt-edge-oblt-pool-095c801b-vhw7',
          label: 'gke-edge-oblt-edge-oblt-pool-095c801b-vhw7',
          ip: '10.36.2.1',
          os: 'Ubuntu',
          cloudProvider: 'gcp',
        },
      ],
    },
  ],
  interval: '10s',
};

export const snapshotAPItHttpResponse = {
  default: () => Promise.resolve(snapshot),
  loading: () => new Promise(() => {}),
  noData: () =>
    Promise.resolve<SnapshotNodeResponse>({
      nodes: snapshot.nodes.map((node) => ({
        ...node,
        metrics: node.metrics.map((metric) => {
          const { rows, ...rest } = metric.timeseries!;
          return {
            ...metric,
            timeseries: {
              ...rest,
              rows: [],
            },
          };
        }),
      })),
    }),
  error: () =>
    new Promise(() => {
      throw new Error('err');
    }),
};

export type SnapshotAPIHttpMocks = keyof typeof snapshotAPItHttpResponse;
