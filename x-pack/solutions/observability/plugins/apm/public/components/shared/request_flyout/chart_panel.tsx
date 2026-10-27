/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

export const CHART_HEIGHT = 200;

/** Each chart has a single series named like its title: a legend would repeat it. */
export const HIDE_LEGEND_SETTINGS = { showLegend: false };

/** Responsive grid of charts, as in the service flyout. */
export function useChartsGridCss() {
  const { euiTheme } = useEuiTheme();

  return css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: ${euiTheme.size.m};
  `;
}

/** Panel with a title (and optional control or help tip) around a chart. */
export function ChartPanel({
  id,
  title,
  titleAction,
  titleTip,
  children,
}: {
  id: string;
  title: string;
  titleAction?: React.ReactNode;
  titleTip?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="none"
      data-test-subj={id}
      css={css`
        min-height: ${CHART_HEIGHT}px;
        min-width: 0;
      `}
    >
      <div
        css={css`
          padding: ${euiTheme.size.s} ${euiTheme.size.m} 0;
        `}
      >
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h4>{title}</h4>
            </EuiTitle>
          </EuiFlexItem>
          {titleTip ? <EuiFlexItem grow={false}>{titleTip}</EuiFlexItem> : null}
        </EuiFlexGroup>
        {titleAction ? (
          <>
            <EuiSpacer size="xs" />
            {titleAction}
          </>
        ) : null}
      </div>
      <div
        css={css`
          height: ${CHART_HEIGHT}px;
        `}
      >
        {children}
      </div>
    </EuiPanel>
  );
}
