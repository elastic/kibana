/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { type PropsWithChildren } from 'react';
import { EuiPanel, type EuiPanelProps } from '@elastic/eui';

export const OnboardingCardContentPanel = React.memo<PropsWithChildren<EuiPanelProps>>(
  ({ children, ...panelProps }) => {
    return (
      <EuiPanel hasShadow={false} hasBorder={false} paddingSize="m">
        <EuiPanel {...panelProps} hasShadow={false} paddingSize="l">
          {children}
        </EuiPanel>
      </EuiPanel>
    );
  }
);
OnboardingCardContentPanel.displayName = 'OnboardingCardContentWrapper';
