/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { last } from 'lodash';
import { useMemo } from 'react';
import type { SnapshotNode, SnapshotNodeMetric } from '../../../../../common/http_api';
import { HostMetics } from '../components/hosts_table_columns';

type MappedMetrics = Record<keyof HostMetics, SnapshotNodeMetric>;

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

  return items;
};
