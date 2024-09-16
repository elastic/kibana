/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';
import { useEuiTheme, useEuiShadow } from '@elastic/eui';

export const useCardContentImagePanelStyles = () => {
  const { euiTheme } = useEuiTheme();
  const shadowStyles = useEuiShadow('m');
  return css`
    .cardSpacer {
      width: 10%;
    }
    .cardImage {
      width: 50%;
      img {
        width: 100%;
        border-radius: ${euiTheme.size.s};
        ${shadowStyles}
      }
    }
  `;
};
