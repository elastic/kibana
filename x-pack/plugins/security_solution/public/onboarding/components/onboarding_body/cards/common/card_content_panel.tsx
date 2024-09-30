/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { type PropsWithChildren } from 'react';
import { EuiPanel, useEuiTheme, type EuiPanelProps } from '@elastic/eui';
import { css } from '@emotion/react';

export const OnboardingCardContentPanel = React.memo<PropsWithChildren<EuiPanelProps>>(
  ({ children, ...panelProps }) => {
    const { euiTheme } = useEuiTheme();
    return (
      <EuiPanel
        hasShadow={false}
        hasBorder={false}
        paddingSize="l"
        css={css`
          padding-top: ${euiTheme.size.s};
        `}
      >
        <EuiPanel {...panelProps} hasShadow={false} paddingSize="none">
          {children}
        </EuiPanel>
      </EuiPanel>
    );
  }
);
OnboardingCardContentPanel.displayName = 'OnboardingCardContentWrapper';
