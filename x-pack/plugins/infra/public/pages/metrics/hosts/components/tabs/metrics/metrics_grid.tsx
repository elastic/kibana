/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiFlexGrid, EuiFlexItem, EuiFlexGroup, EuiText, EuiButtonEmpty } from '@elastic/eui';
import { MetricChart } from './metric_chart';

export const MetricsGrid = () => {
  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween" wrap={false} alignItems="center">
            <EuiFlexItem grow={false} style={{ flex: 1 }}>
              <EuiText size="xs" style={{ wordBreak: 'break-word' }}>
                Showing for <b>Top 20 hosts</b> by <b>most recent timestamp</b>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false} style={{ flex: 1, alignItems: 'flex-end' }}>
              <EuiButtonEmpty color="primary" onClick={() => {}} iconType="help" size="xs">
                How to read these metrics
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
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
            <EuiFlexItem>
              <MetricChart type="diskIORead" />
            </EuiFlexItem>
            <EuiFlexItem>
              <MetricChart type="diskIOWrite" />
            </EuiFlexItem>
          </EuiFlexGrid>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
