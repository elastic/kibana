/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { type PropsWithChildren } from 'react';
import { COLOR_MODES_STANDARD, EuiPanel, useEuiTheme, type EuiPanelProps } from '@elastic/eui';
import { css } from '@emotion/css';

export const OnboardingCardContentPanel = React.memo<PropsWithChildren<EuiPanelProps>>(
  ({ children, ...panelProps }) => {
    const { euiTheme, colorMode } = useEuiTheme();
    const isDarkMode = colorMode === COLOR_MODES_STANDARD.dark;
    return (
      <EuiPanel
        className={css`
          background-color: ${isDarkMode ? euiTheme.colors.lightestShade : ''};
        `}
        style={{ paddingTop: 0 }}
        paddingSize="m"
        hasShadow={false}
        hasBorder={false}
      >
        <EuiPanel {...panelProps} hasShadow={false} paddingSize="l">
          {children}
        </EuiPanel>
      </EuiPanel>
    );
  }
);
OnboardingCardContentPanel.displayName = 'OnboardingCardContentWrapper';
