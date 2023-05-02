/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/css';

import add from '../assets/add.svg';
import or from '../assets/or.svg';

export const cursorAddCss = css`
  cursor: url(${add}), auto;
`;

export const cursorOrCss = css`
  cursor: url(${or}), auto;
`;

export const fieldAndParamCss = (euiTheme: EuiThemeComputed) => css`
  min-width: calc(${euiTheme.size.xl} * 5);
`;

export const operationCss = (euiTheme: EuiThemeComputed) => css`
  max-width: calc(${euiTheme.size.xl} * 4.5);
  // temporary fix to be removed after https://github.com/elastic/eui/issues/2082 is fixed
  .euiComboBox__inputWrap {
    padding-right: calc(${euiTheme.size.base}) !important;
  }
`;

export const getGrabIconCss = (euiTheme: EuiThemeComputed) => css`
  margin: 0 ${euiTheme.size.xxs};
`;

export const actionButtonCss = css`
  &.euiButtonEmpty .euiButtonEmpty__content {
    padding: 0 4px;
  }
`;

export const disabledDraggableCss = css`
  &.euiDraggable .euiDraggable__item.euiDraggable__item--isDisabled {
    cursor: unset;
  }
`;
