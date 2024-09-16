/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';
import { useEuiTheme } from '@elastic/eui';

export const useCardCalloutStyles = () => {
  const { euiTheme } = useEuiTheme();
  return css`
    padding: ${euiTheme.size.s};
    border: 1px solid ${euiTheme.colors.lightShade};
    border-radius: ${euiTheme.size.s};
  `;
};
