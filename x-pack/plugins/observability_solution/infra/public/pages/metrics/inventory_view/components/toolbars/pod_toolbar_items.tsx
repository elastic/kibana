/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { podSnapshotMetricTypes } from '@kbn/metrics-data-access-plugin/common';
import { MetricsAndGroupByToolbarItems } from './metrics_and_groupby_toolbar_items';
import type { ToolbarProps } from './types';

export const podGroupByFields = ['kubernetes.namespace', 'kubernetes.node.name', 'service.type'];

export const PodToolbarItems = (props: ToolbarProps) => {
  return (
    <MetricsAndGroupByToolbarItems
      {...props}
      metricTypes={podSnapshotMetricTypes}
      groupByFields={podGroupByFields}
    />
  );
};
