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
    &.euiListGroupItem--primary {
      font-weight: 700;
    }
    .euiListGroupItem__label {
      width: 100%;
    }
    &.euiListGroupItem:focus,
    &.euiListGroupItem:focus-within,
    &.euiListGroupItem:hover,
    &.euiListGroupItem-isActive {
      background-color: ${primaryBackground};
    }
    &.euiListGroupItem-isActive.euiListGroupItem--primary {
      .euiListGroupItem__button {
        color: ${euiTheme.colors.primaryText};
        font-weight: bold;
      }
    }
    .euiButtonIcon:not([class*='isDisabled']):focus,
    .euiButtonIcon:not([class*='isDisabled']):focus-within,
    .euiButtonIcon:not([class*='isDisabled']):hover {
      background-color: ${primaryBackground};
    }
  `,
});
