/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { last } from 'lodash';
import type { Criteria as EuiCriteria } from '@elastic/eui';
import { EuiTableSortingType } from '@elastic/eui';
import { useMemo, useCallback, useState } from 'react';
import type { SnapshotNode, SnapshotNodeMetric } from '../../../../../common/http_api';
import { SortState } from '../components/hosts_table';
import { HostMetics } from '../components/hosts_table_columns';

export type MappedMetrics = Record<keyof HostMetics, SnapshotNodeMetric>;

export const useHostTable = (nodes: SnapshotNode[]) => {
  const items: MappedMetrics[] = useMemo(() => {
    return nodes.map(({ metrics, path }) => ({
      ...last(path),
      ...metrics.reduce((data, metric) => {
        data[metric.name as keyof HostMetics] = metric;
        return data;
      }, {} as MappedMetrics),
    }));
  }, [nodes]);

  const [sortState, setSortState] = useState<SortState<MappedMetrics>>({
    field: 'cpuCores',
    direction: 'desc',
  });

  function makeSortNodes<T>(sortStateTemp: SortState<T>) {
    return (nodeA: T, nodeB: T) => {
      if (sortStateTemp.field === 'cpuCores') {
        nodeA[sortStateTemp.field].avg = nodeA[sortStateTemp.field]?.value;
        nodeB[sortStateTemp.field].avg = nodeB[sortStateTemp.field]?.value;
      }

      const nodeAValue = nodeA[sortStateTemp.field]?.avg
        ? nodeA[sortStateTemp.field].avg
        : nodeA[sortStateTemp.field];
      const nodeBValue = nodeB[sortStateTemp.field]?.avg
        ? nodeB[sortStateTemp.field].avg
        : nodeB[sortStateTemp.field];

      if (sortStateTemp.direction === 'asc') {
        return sortAscending(nodeAValue, nodeBValue);
      }

      return sortDescending(nodeAValue, nodeBValue);
    };
  }

  function sortAscending(nodeAValue: unknown, nodeBValue: unknown) {
    if (nodeAValue === null) {
      return -1;
    } else if (nodeBValue === null) {
      return 1;
    }

    if (typeof nodeAValue === 'string' && typeof nodeBValue === 'string') {
      return nodeAValue.localeCompare(nodeBValue);
    }

    if (typeof nodeAValue === 'number' && typeof nodeBValue === 'number') {
      return nodeAValue - nodeBValue;
    }

    return 0;
  }

  function sortDescending(nodeAValue: unknown, nodeBValue: unknown) {
    if (nodeAValue === null) {
      return 1;
    } else if (nodeBValue === null) {
      return -1;
    }

    if (typeof nodeAValue === 'string' && typeof nodeBValue === 'string') {
      return nodeBValue.localeCompare(nodeAValue);
    }

    if (typeof nodeAValue === 'number' && typeof nodeBValue === 'number') {
      return nodeBValue - nodeAValue;
    }

    return 0;
  }

  const sortSettings: EuiTableSortingType<MappedMetrics> = {
    enableAllColumns: true,
    sort: sortState,
  };

  const sortedNodes = useMemo(() => {
    return [...items].sort(makeSortNodes(sortState));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, sortState]);

  const onTableSortChange = useCallback(
    ({ sort }: EuiCriteria<MappedMetrics>) => {
      if (!sort) {
        return;
      }

      setSortState(sort);
    },
    [setSortState]
  );

  return { sortedNodes, sortSettings, onTableSortChange };
};
