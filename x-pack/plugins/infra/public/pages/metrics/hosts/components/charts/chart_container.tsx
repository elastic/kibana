/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiFlexGrid, EuiFlexItem } from '@elastic/eui';
import { MetricChart } from './metric_chart';

export const ChartContainer = () => {
  return (
    <>
      <EuiFlexGrid columns={2} gutterSize="s" data-test-subj="hostsView-metricsTrend">
        <EuiFlexItem>
          <MetricChart type="cpuCores" />
        </EuiFlexItem>
        <EuiFlexItem>
          <MetricChart type="cpu" />
        </EuiFlexItem>
        <EuiFlexItem style={{ gridColumn: '1/-1' }}>
          <MetricChart type="memory" />
        </EuiFlexItem>
        <EuiFlexItem>
          <MetricChart type="rx" />
        </EuiFlexItem>
        <EuiFlexItem>
          <MetricChart type="tx" />
        </EuiFlexItem>
      </EuiFlexGrid>
    </>
  );
};
