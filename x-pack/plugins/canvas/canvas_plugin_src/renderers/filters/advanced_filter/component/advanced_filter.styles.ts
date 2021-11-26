/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/react';

export const advancedFilterStyles = css`
  width: 100%;
  font-size: inherit;
`;

export const advancedFilterInputStylesFactory = (theme: EuiThemeComputed) => css`
  background-color: ${theme.colors.emptyShade};
  width: 100%;
  padding: ${theme.size.xs} ${theme.size.base};
  border: ${theme.border.thin};
  border-radius: ${theme.border.radius};
  font-size: inherit;
  line-height: 19px;
  font-family: monospace;

  &:focus {
    box-shadow: none;
  }
`;

export const advancedFilterButtonStylesFactory = (theme: EuiThemeComputed) => css`
  width: 100%;
  padding: ${theme.size.xs} ${theme.size.s};
  border: ${theme.border.thin};
  border-radius: ${theme.border.radius};
  background-color: ${theme.colors.emptyShade};
  font-size: inherit;

  &:hover {
    background-color: ${theme.colors.lightestShade};
  }
`;
