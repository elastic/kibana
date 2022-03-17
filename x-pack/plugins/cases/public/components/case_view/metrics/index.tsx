/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiPanel } from '@elastic/eui';
import { CaseViewMetricItems } from './totals';
import { CaseViewMetricsProps } from './types';
import { CaseStatusMetrics } from './status';

export const CaseViewMetrics: React.FC<CaseViewMetricsProps> = React.memo(
  ({ metrics, features, isLoading }) => (
    <EuiPanel data-test-subj="case-view-metrics-panel" hasShadow={false} hasBorder={true}>
      <EuiFlexGroup gutterSize="xl" wrap={true} responsive={false} alignItems="center">
        {isLoading ? (
          <EuiFlexItem>
            <EuiLoadingSpinner data-test-subj="case-view-metrics-spinner" size="l" />
          </EuiFlexItem>
        ) : (
          <>
            <CaseViewMetricItems metrics={metrics} features={features} />
            <CaseStatusMetrics metrics={metrics} features={features} />
          </>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  )
);
CaseViewMetrics.displayName = 'CaseViewMetrics';
