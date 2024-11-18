/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';
import { useEuiTheme, useEuiShadow, COLOR_MODES_STANDARD } from '@elastic/eui';

export const useCardContentImagePanelStyles = () => {
  const { euiTheme, colorMode } = useEuiTheme();
  const shadowStyles = useEuiShadow('m');
  const isDarkMode = colorMode === COLOR_MODES_STANDARD.dark;
  return css`
    padding-top: 8px;
    ${isDarkMode ? `background-color: ${euiTheme.colors.lightestShade}` : ''};
    .cardSpacer {
      width: 8%;
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
