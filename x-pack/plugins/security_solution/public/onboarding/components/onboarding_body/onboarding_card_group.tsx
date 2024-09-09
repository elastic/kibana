/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren } from 'react';
import { useEuiTheme, EuiPanel, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';

export const OnboardingCardGroup = React.memo<PropsWithChildren<{ title: string }>>(
  ({ title, children }) => {
    const { euiTheme } = useEuiTheme();
    return (
      <EuiPanel
        color="plain"
        element="div"
        grow={false}
        paddingSize="none"
        hasShadow={false}
        borderRadius="none"
        css={css`
          margin: ${euiTheme.size.l} 0;
          padding-top: 4px;
          background-color: ${euiTheme.colors.lightestShade};
        `}
      >
        <h2
          css={css`
            font-size: ${euiTheme.base * 1.375}px;
            font-weight: ${euiTheme.font.weight.bold};
          `}
        >
          {title}
        </h2>
        <EuiSpacer size="l" />
        {children}
      </EuiPanel>
    );
  }
);
OnboardingCardGroup.displayName = 'OnboardingCardGroup';
