/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';

export const containerCss = (theme: EuiThemeComputed) => ({
  minHeight: `calc(100vh - ${parseFloat(theme.size.xxxl) * 2}px)`,
  background: theme.colors.emptyShade,
  display: 'flex',
  flexDirection: 'column',
});

export const wrapperCss = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
};

export const navCss = (theme: EuiThemeComputed) => ({
  background: theme.colors.emptyShade,
  borderBottom: theme.border.thin,
  padding: `${theme.size.base} ${theme.size.l} ${theme.size.base} ${theme.size.l}`,
  '.euiTabs': {
    paddingLeft: '3px',
    marginLeft: '-3px',
  },
});
