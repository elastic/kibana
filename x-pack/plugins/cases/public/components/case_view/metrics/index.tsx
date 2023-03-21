/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiPanel } from '@elastic/eui';
import { useGetCaseMetrics } from '../../../containers/use_get_case_metrics';
import { CaseViewMetricItems } from './totals';
import { CaseStatusMetrics } from './status';
import { useCasesFeatures } from '../../../common/use_cases_features';

export const CaseViewMetrics = React.memo(({ caseId }: { caseId: string }) => {
  const { metricsFeatures } = useCasesFeatures();
  const { data, isLoading } = useGetCaseMetrics(caseId, metricsFeatures);

  if (metricsFeatures.length === 0) {
    return null;
  }

  return (
    <EuiPanel data-test-subj="case-view-metrics-panel" hasShadow={false} hasBorder={true}>
      <EuiFlexGroup gutterSize="xl" wrap={true} responsive={false} alignItems="center">
        {isLoading || !data ? (
          <EuiFlexItem>
            <EuiLoadingSpinner data-test-subj="case-view-metrics-spinner" size="l" />
          </EuiFlexItem>
        ) : (
          <>
            <CaseViewMetricItems metrics={data.metrics} features={metricsFeatures} />
            <CaseStatusMetrics metrics={data.metrics} features={metricsFeatures} />
          </>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
});
CaseViewMetrics.displayName = 'CaseViewMetrics';
