/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

interface Props {
  title: string;
  subtitle?: string;
  iconType?: string;
  action?: React.ReactNode;
  filled?: boolean;
}

export const DataPanel: React.FC<Props> = ({
  title,
  subtitle,
  iconType,
  action,
  filled,
  children,
}) => (
  <EuiPanel color={filled ? 'subdued' : 'plain'} hasShadow={false}>
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem>
        <EuiFlexGroup>
          {iconType ? (
            <EuiFlexItem>
              <EuiIcon type={iconType} />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h4>{title}</h4>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{action}</EuiFlexItem>
    </EuiFlexGroup>
    {subtitle ? (
      <EuiText size="s" color="subdued">
        <p>{subtitle}</p>
      </EuiText>
    ) : null}
    <EuiSpacer />
    {children}
  </EuiPanel>
);
