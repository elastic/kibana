/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useHostsTable } from './use_hosts_table';
import { renderHook } from '@testing-library/react-hooks';
import { SnapshotNode } from '../../../../../common/http_api';

jest.mock('uuid', () => ({
  v4: () => 'uuidv4',
}));

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
            name: 'cpu',
            value: 0.6353277777777777,
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
            name: 'cpu',
            value: 0.8647805555555556,
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
        uuid: 'uuidv4',
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
        cpu: {
          name: 'cpu',
          value: 0.6353277777777777,
        },
        memoryTotal: {
          name: 'memoryTotal',

          avg: 34359.738368,
        },
      },
      {
        name: 'host-1',
        os: 'macOS',
        uuid: 'uuidv4',
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
        cpu: {
          name: 'cpu',
          value: 0.8647805555555556,
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
