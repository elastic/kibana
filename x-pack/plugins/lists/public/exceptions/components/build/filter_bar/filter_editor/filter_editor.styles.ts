/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/css';

export const filtersBuilderMaxHeightCss = (euiTheme: EuiThemeComputed) => css`
  max-height: ${euiTheme.size.base} * 10;
`;

/** @todo: should be removed, no hardcoded sizes **/
export const filterBadgeStyle = css`
  .euiFormRow__fieldWrapper {
    line-height: 1.5;
  }
`;

export const filterPreviewLabelStyle = css`
  & .euiFormLabel[for] {
    cursor: default;
  }
`;
