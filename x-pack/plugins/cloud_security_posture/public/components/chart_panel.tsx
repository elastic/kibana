/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPanel,
  EuiText,
  EuiTitle,
  EuiLoadingChart,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { CHART_PANEL_TEST_SUBJECTS } from './constants';

interface ChartPanelProps {
  title?: string;
  hasBorder?: boolean;
  isLoading: boolean;
  isError: boolean;
}

const Loading = () => (
  <EuiFlexGroup
    justifyContent="center"
    alignItems="center"
    data-test-subj={CHART_PANEL_TEST_SUBJECTS.LOADING}
  >
    <EuiLoadingChart size="m" />
  </EuiFlexGroup>
);

const Error = () => (
  <EuiFlexGroup
    justifyContent="center"
    alignItems="center"
    data-test-subj={CHART_PANEL_TEST_SUBJECTS.ERROR}
  >
    <EuiText size="xs" color="subdued">
      {'Error'}
    </EuiText>
  </EuiFlexGroup>
);

export const ChartPanel: React.FC<ChartPanelProps> = ({
  title,
  hasBorder = true,
  isLoading,
  isError,
  children,
}) => {
  const renderChart = () => {
    if (isLoading) return <Loading />;
    if (isError) return <Error />;
    return children;
  };

  return (
    <EuiPanel hasBorder={hasBorder} hasShadow={false} data-test-subj="chart-panel">
      <EuiFlexGroup direction="column" gutterSize="none" style={{ height: '100%' }}>
        <EuiFlexItem grow={false}>
          {title && (
            <EuiTitle size="s">
              <h3>{title}</h3>
            </EuiTitle>
          )}
        </EuiFlexItem>
        <EuiFlexItem>{renderChart()}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
