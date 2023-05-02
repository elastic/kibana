/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';
import { euiThemeVars } from '@kbn/ui-theme';
import type { EuiThemeComputed } from '@elastic/eui';

export const badgePaddingCss = (euiTheme: EuiThemeComputed) => css`
  padding: calc(${euiTheme.size.xs} + ${euiTheme.size.xxs});
`;

export const marginLeftLabelCss = (euiTheme: EuiThemeComputed) => css`
  margin-left: ${euiTheme.size.xs};
`;

export const bracketColorCss = css`
  color: ${euiThemeVars.euiColorPrimary};
`;

export const conditionSpacesCss = (euiTheme: EuiThemeComputed) => css`
  margin-inline: -${euiTheme.size.xs};
`;

export const conditionCss = css`
  ${bracketColorCss}
`;
