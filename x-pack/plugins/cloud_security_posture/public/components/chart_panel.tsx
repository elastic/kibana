/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import { EuiPanel, EuiText, EuiTitle, EuiLoadingChart, EuiFlexGroup } from '@elastic/eui';
import { CHART_PANEL_TEST_SUBJECTS } from './constants';

interface ChartPanelProps<TData = unknown> {
  title?: string;
  description?: string;
  hasBorder?: boolean;
  isLoading: boolean;
  isError: boolean;
  data: TData;
  chart: React.FC<{ data: TData }>;
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

const Empty = () => (
  <EuiFlexGroup
    justifyContent="center"
    alignItems="center"
    data-test-subj={CHART_PANEL_TEST_SUBJECTS.EMPTY}
  >
    <EuiText size="xs" color="subdued">
      {'No data to display'}
    </EuiText>
  </EuiFlexGroup>
);

export const ChartPanel = <TData extends unknown>({
  title,
  description,
  hasBorder = true,
  chart: Chart,
  isLoading,
  isError,
  data,
}: ChartPanelProps<TData>) => {
  const renderChart = useCallback(() => {
    if (isLoading) return <Loading />;
    if (isError) return <Error />;
    if (!data) return <Empty />;
    return <Chart data={data} />;
  }, [isLoading, isError, data, Chart]);

  return (
    <EuiPanel hasBorder={hasBorder} hasShadow={false} data-test-subj="chart-panel">
      <EuiFlexGroup direction="column" gutterSize="xs">
        {title && (
          <EuiTitle size="s" css={euiTitleStyle}>
            <h3>{title}</h3>
          </EuiTitle>
        )}
        {description && (
          <EuiText size="xs" color="subdued">
            {description}
          </EuiText>
        )}
        {renderChart()}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const euiTitleStyle = css`
  font-weight: 400;
`;
