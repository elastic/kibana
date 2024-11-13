/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiPanel, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';

export function StreamsAppPageBody({ children }: { children: React.ReactNode }) {
  const theme = useEuiTheme().euiTheme;
  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      className={css`
        border-top: 1px solid ${theme.colors.lightShade};
        border-radius: 0px;
      `}
      paddingSize="l"
    >
      {children}
    </EuiPanel>
  );
}
