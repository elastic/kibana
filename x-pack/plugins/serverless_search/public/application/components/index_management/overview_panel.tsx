/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren } from 'react';
import { EuiSpacer, EuiSplitPanel, EuiTitle } from '@elastic/eui';

export interface IndexOverviewPanelProps {
  title: React.ReactNode;
  footer?: React.ReactNode | React.ReactNode[];
}

export const IndexOverviewPanel: FC<PropsWithChildren<IndexOverviewPanelProps>> = ({
  title,
  footer,
  children,
}) => (
  <EuiSplitPanel.Outer grow>
    <EuiSplitPanel.Inner>
      <EuiTitle size="xxs">
        <h6>{title}</h6>
      </EuiTitle>
      <EuiSpacer size="s" />
      {children}
    </EuiSplitPanel.Inner>
    {footer && (
      <EuiSplitPanel.Inner grow={false} color="subdued">
        {footer}
      </EuiSplitPanel.Inner>
    )}
  </EuiSplitPanel.Outer>
);

export const IndexOverviewPanelStat: FC<PropsWithChildren<unknown>> = ({ children }) => (
  <EuiTitle size="l">
    <p>{children}</p>
  </EuiTitle>
);
