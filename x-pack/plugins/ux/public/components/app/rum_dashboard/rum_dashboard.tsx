/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { UXMetrics } from './ux_metrics';
import { ImpactfulMetrics } from './impactful_metrics';
import { PageLoadAndViews } from './panels/page_load_and_views';
import { VisitorBreakdownsPanel } from './panels/visitor_breakdowns';
import { useBreakpoints } from '../../../hooks/use_breakpoints';
import { ClientMetrics } from './client_metrics';

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
