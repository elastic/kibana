/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiProgress, EuiFlexItem, EuiLoadingChart } from '@elastic/eui';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const ChartLoadingProgress = ({
  hidePanelTitles = false,
}: {
  hidePanelTitles?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiProgress
      size="xs"
      color="accent"
      position="absolute"
      css={css`
        top: ${hidePanelTitles ? 0 : euiTheme.size.l};
        z-index: ${Number(euiTheme.levels.header) - 1};
      `}
    />
  );
};

export const ChartPlaceholder = ({
  style,
  hidePanelTitles = false,
}: {
  style?: React.CSSProperties;
  hidePanelTitles?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <>
      <ChartLoadingProgress hidePanelTitles />
      <EuiFlexGroup
        style={{ ...style, marginTop: hidePanelTitles ? 0 : euiTheme.size.l }}
        justifyContent="center"
        alignItems="center"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiLoadingChart mono size="l" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
