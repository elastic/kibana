/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useHostTable } from './use_host_table';
import { renderHook } from '@testing-library/react-hooks';

describe('useHostTable hook', () => {
  it('it should map the nodes returned from the snapshot api to a format matching eui table items', () => {
    const nodes = [
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
        path: [{ value: 'host-0', label: 'host-0', os: null }],
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
        cpuCores: 10,
        memory: 0.94525,
        memoryTotal: 34359.738368,
        os: '-',
        rx: 252456.92916666667,
        tx: 252758.425,
        name: 'host-0',
      },
      {
        cpuCores: 8,
        memory: 0.5400000214576721,
        memoryTotal: 9.194304,
        os: 'macOS',
        rx: 95.86339715321859,
        tx: 110.38566859563191,
        name: 'host-1',
      },
    ];
    const result = renderHook(() => useHostTable(nodes));

    expect(result.result.current).toStrictEqual(items);
  });
});
