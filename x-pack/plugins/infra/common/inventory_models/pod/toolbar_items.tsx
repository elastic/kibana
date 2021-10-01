/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ToolbarProps } from '../../../public/pages/metrics/inventory_view/components/toolbars/toolbar';
import { MetricsAndGroupByToolbarItems } from '../shared/components/metrics_and_groupby_toolbar_items';
import { SnapshotMetricType } from '../types';

export const podMetricTypes: SnapshotMetricType[] = ['cpu', 'memory', 'rx', 'tx'];
export const podGroupByFields = ['kubernetes.namespace', 'kubernetes.node.name', 'service.type'];

export const PodToolbarItems = (props: ToolbarProps) => {
  return (
    <MetricsAndGroupByToolbarItems
      {...props}
      metricTypes={podMetricTypes}
      groupByFields={podGroupByFields}
    />
  );
};
