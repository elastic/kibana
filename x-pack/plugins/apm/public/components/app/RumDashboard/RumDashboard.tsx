/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { UXMetrics } from './UXMetrics';
import { ImpactfulMetrics } from './ImpactfulMetrics';
import { PageLoadAndViews } from './Panels/PageLoadAndViews';
import { VisitorBreakdownsPanel } from './Panels/VisitorBreakdowns';
import { useBreakpoints } from '../../../hooks/use_breakpoints';
import { ClientMetrics } from './ClientMetrics';

export function RumDashboard() {
  const { isSmall } = useBreakpoints();

  return (
    <EuiFlexGroup direction={isSmall ? 'row' : 'column'} gutterSize="s">
      <EuiFlexItem>
        <ClientMetrics />
      </EuiFlexItem>
      <EuiFlexItem>
        <UXMetrics />
      </EuiFlexItem>
      <EuiFlexItem>
        <PageLoadAndViews />
      </EuiFlexItem>
      <EuiFlexItem>
        <VisitorBreakdownsPanel />
      </EuiFlexItem>
      <EuiFlexItem>
        <ImpactfulMetrics />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
