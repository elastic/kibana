/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { SnapshotNode } from '../../../../../common/http_api';
import { HostMetics } from '../components/hosts_table_columns';

type MappedMetrics = Record<keyof HostMetics, number | null | undefined>;

export const useHostTable = (nodes: SnapshotNode[]) => {
  const items = useMemo(() => {
    const valuesMapping: Record<keyof HostMetics, 'value' | 'avg' | 'max'> = {
      cpuCores: 'value',
      rx: 'avg',
      tx: 'avg',
      memory: 'avg',
      memoryTotal: 'avg',
    };
    return nodes.map(({ metrics, path, name }) => ({
      name,
      os: path.at(-1)?.os ?? '-',
      ...metrics.reduce((data, metric) => {
        const metricName = metric.name as keyof HostMetics;
        data[metricName] = metric[valuesMapping[metricName]];
        return data;
      }, {} as MappedMetrics),
    }));
  }, [nodes]);

  return items;
};
