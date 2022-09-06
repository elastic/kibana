/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { containerSnapshotMetricTypes } from '../../../../../../common/inventory_models/container';
import { MetricsAndGroupByToolbarItems } from './metrics_and_groupby_toolbar_items';
import type { ToolbarProps } from './types';

export const containerGroupByFields = [
  'host.name',
  'cloud.availability_zone',
  'cloud.machine.type',
  'cloud.project.id',
  'cloud.provider',
  'service.type',
];

export const ContainerToolbarItems = (props: ToolbarProps) => {
  return (
    <MetricsAndGroupByToolbarItems
      {...props}
      metricTypes={containerSnapshotMetricTypes}
      groupByFields={containerGroupByFields}
    />
  );
};
