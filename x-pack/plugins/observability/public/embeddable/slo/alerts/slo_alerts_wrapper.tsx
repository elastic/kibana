/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { SloAlertsSummary } from './components/slo_alerts_summary';
import { SloAlertsTable } from './components/slo_alerts_table';

export function SloAlertsWrapper({ slos, deps, timeRange }) {
  return (
    <EuiFlexGroup direction="column" style={{ margin: '10px' }}>
      <EuiFlexItem>
        <SloAlertsSummary slos={slos} deps={deps} timeRange={timeRange} />
      </EuiFlexItem>
      <EuiFlexItem>
        <SloAlertsTable slos={slos} deps={deps} timeRange={timeRange} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
