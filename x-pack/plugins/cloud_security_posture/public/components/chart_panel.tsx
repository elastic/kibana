/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import {
  EuiPanel,
  EuiText,
  EuiTitle,
  EuiLoadingChart,
  EuiFlexGroup,
  EuiSpacer,
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
  const renderChart = useCallback(() => {
    if (isLoading) return <Loading />;
    if (isError) return <Error />;
    return children;
  }, [isLoading, isError, children]);

  return (
    <EuiPanel hasBorder={hasBorder} hasShadow={false} data-test-subj="chart-panel">
      {title && (
        <EuiTitle size="s" css={euiTitleStyle}>
          <h3>{title}</h3>
        </EuiTitle>
      )}
      <EuiSpacer />
      {renderChart()}
    </EuiPanel>
  );
};

const euiTitleStyle = css`
  font-weight: 400;
`;
