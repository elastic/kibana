/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { PingHistogram } from './ping_histogram/ping_histogram_container';
import { MonitorDuration } from './monitor_duration/monitor_duration_container';

interface MonitorChartsProps {
  monitorId: string;
}
export const MONITOR_CHART_HEIGHT = '248px';

export const MonitorCharts = ({ monitorId }: MonitorChartsProps) => {
  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem>
        <MonitorDuration monitorId={monitorId} />
      </EuiFlexItem>
      <EuiFlexItem>
        <PingHistogram height={MONITOR_CHART_HEIGHT} isResponsive={false} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
