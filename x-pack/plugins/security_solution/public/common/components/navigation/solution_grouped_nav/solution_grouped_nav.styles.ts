/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiThemeComputed, transparentize } from '@elastic/eui';

export const solutionGroupedNavStyles = (euiTheme: EuiThemeComputed<{}>) => ({
  sideNavItem: `
    font-weight: ${euiTheme.font.weight.regular};
    &.solutionGroupedNavItem--isPrimary {
      font-weight: ${euiTheme.font.weight.bold};
    }
    &:focus,
    &:focus-within,
    &:hover,
    &.solutionGroupedNavItem--isActive {
      background-color: ${transparentize(euiTheme.colors.primary, 0.1)};
    }
    .solutionGroupedNavItemButton:focus,
    .solutionGroupedNavItemButton:focus-within,
    .solutionGroupedNavItemButton:hover {
      background-color: ${transparentize(euiTheme.colors.primary, 0.1)};
    }
  `,
});
