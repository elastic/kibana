/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { PingHistogram } from './ping_histogram/ping_histogram_container';
import { MonitorDuration } from './monitor_duration/monitor_duration_container';

interface MonitorChartsProps {
  monitorId: string;
}

export const MonitorCharts = ({ monitorId }: MonitorChartsProps) => {
  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem>
        <MonitorDuration monitorId={monitorId} />
      </EuiFlexItem>
      <EuiFlexItem>
        <PingHistogram height="400px" isResponsive={false} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
