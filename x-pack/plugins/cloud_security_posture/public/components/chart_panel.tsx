/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import {
  EuiPanel,
  EuiText,
  EuiTitle,
  EuiLoadingChart,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
} from '@elastic/eui';
import { CHART_PANEL_TEST_SUBJECTS } from './test_subjects';

interface ChartPanelProps {
  title?: string;
  hasBorder?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  rightSideItems?: ReactNode[];
  styles?: React.CSSProperties;
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
  rightSideItems,
  styles,
}) => {
  const { euiTheme } = useEuiTheme();
  const renderChart = () => {
    if (isLoading) return <Loading />;
    if (isError) return <Error />;
    return children;
  };

  return (
    <EuiPanel hasBorder={hasBorder} hasShadow={false} style={styles} data-test-subj="chart-panel">
      <EuiFlexGroup direction="column" gutterSize="m" style={{ height: '100%' }}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent={'spaceBetween'}>
            <EuiFlexItem grow={false} style={{ justifyContent: 'center' }}>
              {title && (
                <EuiTitle size="s">
                  <h3 style={{ lineHeight: 'initial', paddingLeft: euiTheme.size.s }}>{title}</h3>
                </EuiTitle>
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false} style={{ flexDirection: 'row', gap: euiTheme.size.s }}>
              {rightSideItems}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem style={{ height: '100%' }}>{renderChart()}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
