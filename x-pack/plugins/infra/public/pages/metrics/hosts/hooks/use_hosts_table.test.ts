/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useHostsTable } from './use_hosts_table';
import { renderHook } from '@testing-library/react-hooks';
import { SnapshotNode } from '../../../../../common/http_api';

describe('useHostTable hook', () => {
  it('it should map the nodes returned from the snapshot api to a format matching eui table items', () => {
    const nodes: SnapshotNode[] = [
      {
        metrics: [
          {
            name: 'rx',
            avg: 252456.92916666667,
          },
          {
            name: 'tx',
            avg: 252758.425,
          },
          {
            name: 'memory',
            avg: 0.94525,
          },
          {
            name: 'cpuCores',
            value: 10,
          },
          {
            name: 'memoryTotal',
            avg: 34359.738368,
          },
        ],
        path: [{ value: 'host-0', label: 'host-0', os: null, cloudProvider: 'aws' }],
        name: 'host-0',
      },
      {
        metrics: [
          {
            name: 'rx',
            avg: 95.86339715321859,
          },
          {
            name: 'tx',
            avg: 110.38566859563191,
          },
          {
            name: 'memory',
            avg: 0.5400000214576721,
          },
          {
            name: 'cpuCores',
            value: 8,
          },
          {
            name: 'memoryTotal',
            avg: 9.194304,
          },
        ],
        path: [
          { value: 'host-1', label: 'host-1' },
          { value: 'host-1', label: 'host-1', ip: '243.86.94.22', os: 'macOS' },
        ],
        name: 'host-1',
      },
    ];

    const items = [
      {
        name: 'host-0',
        os: '-',
        title: {
          cloudProvider: 'aws',
          name: 'host-0',
        },
        rx: {
          name: 'rx',
          avg: 252456.92916666667,
        },
        tx: {
          name: 'tx',
          avg: 252758.425,
        },
        memory: {
          name: 'memory',
          avg: 0.94525,
        },
        cpuCores: {
          name: 'cpuCores',
          value: 10,
        },
        memoryTotal: {
          name: 'memoryTotal',

          avg: 34359.738368,
        },
      },
      {
        name: 'host-1',
        os: 'macOS',
        title: {
          cloudProvider: null,
          name: 'host-1',
        },
        rx: {
          name: 'rx',
          avg: 95.86339715321859,
        },
        tx: {
          name: 'tx',
          avg: 110.38566859563191,
        },
        memory: {
          name: 'memory',
          avg: 0.5400000214576721,
        },
        cpuCores: {
          name: 'cpuCores',
          value: 8,
        },
        memoryTotal: {
          name: 'memoryTotal',
          avg: 9.194304,
        },
      },
    ];
    const time = { from: 'now-15m', to: 'now', interval: '>=1m' };

    const { result } = renderHook(() => useHostsTable(nodes, { time }));

    expect(result.current.items).toStrictEqual(items);
  });
});
