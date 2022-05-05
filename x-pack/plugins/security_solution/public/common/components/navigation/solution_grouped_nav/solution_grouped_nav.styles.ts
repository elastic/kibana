/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiThemeComputed } from '@elastic/eui';

const primaryBackground = 'rgba(0, 119, 204, 0.1)';

export const solutionGroupedNavStyles = (euiTheme: EuiThemeComputed<{}>) => ({
  sideNavItem: `
    font-weight: 400;
    &.solutionGroupedNavItem--isPrimary {
      font-weight: 700;
    }
    &:focus,
    &:focus-within,
    &:hover,
    &.solutionGroupedNavItem--isActive {
      background-color: ${primaryBackground};
    }
    .solutionGroupedNavItemButton:focus,
    .solutionGroupedNavItemButton:focus-within,
    .solutionGroupedNavItemButton:hover {
      background-color: ${primaryBackground};
    }
  `,
});
