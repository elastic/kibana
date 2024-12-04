/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, type EuiFlexGroupProps, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import React from 'react';

export const LogStatusbar = (props: EuiFlexGroupProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="none"
      justifyContent="flexEnd"
      css={css`
        padding: ${euiTheme.size.s};
        border-top: ${euiTheme.border.thin};
        max-height: 48px;
        min-height: 48px;
        background-color: ${euiTheme.colors.emptyShade};
        flex-direction: row;
      `}
      {...props}
    />
  );
};

export const LogStatusbarItem = EuiFlexItem;
