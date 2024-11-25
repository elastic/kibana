/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiPageHeader, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import React from 'react';

export function StreamsAppPageHeader({
  title,
  children,
  verticalPaddingSize = 'l',
}: {
  title: React.ReactNode;
  children?: React.ReactNode;
  verticalPaddingSize?: 'none' | 'l';
}) {
  const theme = useEuiTheme().euiTheme;

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiPageHeader
        className={css`
          padding: ${verticalPaddingSize === 'none' ? 0 : theme.size[verticalPaddingSize]}
            ${theme.size.l};
        `}
      >
        {title}
      </EuiPageHeader>
      {children}
    </EuiFlexGroup>
  );
}
