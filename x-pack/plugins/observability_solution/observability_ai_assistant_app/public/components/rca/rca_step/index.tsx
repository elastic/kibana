/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { rgba } from 'polished';
import React from 'react';
import { useTheme } from '../../../hooks/use_theme';

export interface RootCauseAnalysisStepItemProps {
  label: React.ReactNode;
  loading?: boolean;
  color?: React.ComponentProps<typeof EuiPanel>['color'];
  iconType?: React.ComponentProps<typeof EuiIcon>['type'];
}

export function RootCauseAnalysisStepItem({
  label,
  loading,
  color,
  iconType,
}: RootCauseAnalysisStepItemProps) {
  const theme = useTheme();

  const panelClassName =
    color && color !== 'transparent' && color !== 'plain' && color !== 'subdued'
      ? css`
          border: 1px solid;
          border-color: ${rgba(theme.colors[color], 0.25)};
        `
      : undefined;

  return (
    <EuiPanel hasBorder paddingSize="l" color={color} className={panelClassName}>
      <EuiFlexGroup direction="row" alignItems="center" justifyContent="flexStart" gutterSize="m">
        <EuiFlexItem grow={false}>
          {loading ? <EuiLoadingSpinner size="s" /> : <EuiIcon type={iconType || 'logoElastic'} />}
        </EuiFlexItem>
        <EuiFlexItem grow>
          <EuiText size="s" className={css``}>
            {label}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
