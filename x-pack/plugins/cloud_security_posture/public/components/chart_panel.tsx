/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, FC, PropsWithChildren } from 'react';
import type { Interpolation, Theme } from '@emotion/react';
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
  css?: Interpolation<Theme>;
  children: React.ReactNode;
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

export const ChartPanel: FC<PropsWithChildren<ChartPanelProps>> = ({
  title,
  hasBorder = true,
  isLoading,
  isError,
  children,
  rightSideItems,
  styles,
  css,
}) => {
  const { euiTheme } = useEuiTheme();
  const renderChart = () => {
    if (isLoading) return <Loading />;
    if (isError) return <Error />;
    return children;
  };

  return (
    <EuiPanel
      hasBorder={hasBorder}
      hasShadow={false}
      style={styles}
      css={css}
      data-test-subj="chart-panel"
    >
      <EuiFlexGroup direction="column" gutterSize="m" css={{ height: '100%' }}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent={'spaceBetween'}>
            <EuiFlexItem grow={false} css={{ justifyContent: 'center' }}>
              {title && (
                <EuiTitle size="s">
                  <h3 css={{ lineHeight: 'initial', paddingLeft: euiTheme.size.s }}>{title}</h3>
                </EuiTitle>
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false} css={{ flexDirection: 'row', gap: euiTheme.size.s }}>
              {rightSideItems}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem css={{ height: '100%' }}>{renderChart()}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
