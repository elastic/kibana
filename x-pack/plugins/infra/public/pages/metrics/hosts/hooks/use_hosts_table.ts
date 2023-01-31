/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { SnapshotNode, SnapshotNodeMetric } from '../../../../../common/http_api';
import { HostMetrics } from '../components/hosts_table_columns';

type MappedMetrics = Record<keyof HostMetrics, SnapshotNodeMetric>;

export const useHostsTable = (nodes: SnapshotNode[]) => {
  const items = useMemo(() => {
    return nodes.map(({ metrics, path, name }) => ({
      name,
      os: path.at(-1)?.os ?? '-',
      title: {
        name,
        cloudProvider: path.at(-1)?.cloudProvider ?? null,
      },
      ...metrics.reduce((data, metric) => {
        data[metric.name as keyof HostMetrics] = metric;
        return data;
      }, {} as MappedMetrics),
    }));
  }, [nodes]);

  return items;
};
