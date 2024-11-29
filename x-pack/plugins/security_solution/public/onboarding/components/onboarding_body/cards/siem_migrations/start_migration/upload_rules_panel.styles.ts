/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';
import { useEuiTheme } from '@elastic/eui';

export const useStyles = (compressed: boolean) => {
  const { euiTheme } = useEuiTheme();
  const logoSize = compressed ? '32px' : '88px';
  return css`
    .siemMigrationsIcon {
      width: ${logoSize};
      block-size: ${logoSize};
      inline-size: ${logoSize};
    }
    .siemMigrationsUploadTitle {
      font-weight: ${euiTheme.font.weight.semiBold};
    }
  `;
};
