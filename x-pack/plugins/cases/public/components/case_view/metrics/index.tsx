/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiDescriptionList, EuiSpacer } from '@elastic/eui';
import { CaseViewMetricItems } from './totals';
import { CaseViewMetricsProps } from './types';
import { CaseStatusMetrics } from './status';

export const CaseViewMetrics: React.FC<CaseViewMetricsProps> = React.memo(
  ({ metrics, features, isLoading }) => (
    <div data-test-subj="case-view-metrics-panel">
      {isLoading ? (
        <EuiLoadingSpinner data-test-subj="case-view-metrics-spinner" size="l" />
      ) : (
        <EuiDescriptionList textStyle="reverse">
          <CaseViewMetricItems metrics={metrics} features={features} />
          <CaseStatusMetrics metrics={metrics} features={features} />
        </EuiDescriptionList>
      )}
      <EuiSpacer />
    </div>
  )
);
CaseViewMetrics.displayName = 'CaseViewMetrics';
