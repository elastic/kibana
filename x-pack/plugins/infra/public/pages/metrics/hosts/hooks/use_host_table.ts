/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { last } from 'lodash';
import { useMemo } from 'react';
import { SnapshotNode } from '../../../../../common/http_api';
import { HostMetics, HostNodeRow } from '../components/hosts_table_columns';

export type MappedMetrics = Record<keyof HostMetics, number | null | undefined>;

export const useHostTable = (nodes: SnapshotNode[]) => {
  const items: HostNodeRow[] = useMemo(() => {
    return nodes.map(({ metrics, path, name }) => ({
      name,
      os: last(path)?.os ?? '-',
      ...metrics.reduce((data, metric) => {
        data[metric.name as keyof HostMetics] =
          metric.name === 'cpuCores' ? metric?.value : metric?.avg;
        return data;
      }, {} as HostMetics),
    }));
  }, [nodes]);

  return items;
};
