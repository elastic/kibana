/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COLOR_MODES_STANDARD, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';

export const useCardStyles = () => {
  const { euiTheme, colorMode } = useEuiTheme();
  const isDarkMode = colorMode === COLOR_MODES_STANDARD.dark;

  return css`
    min-width: 315px;
    &.headerCard:hover {
      *:not(.headerCardContent) {
        text-decoration: none;
      }
      .headerCardContent,
      .headerCardContent * {
        text-decoration: underline;
        text-decoration-color: ${euiTheme.colors.primaryText};
      }
    }

    ${isDarkMode
      ? `
          background-color: ${euiTheme.colors.lightestShade};
          box-shadow: none;
          border: 1px solid ${euiTheme.colors.mediumShade};
        `
      : ''}

    .headerCardTitle {
      font-size: ${euiTheme.base * 0.875}px;
      font-weight: ${euiTheme.font.weight.semiBold};
      line-height: ${euiTheme.size.l};
      color: ${euiTheme.colors.title};
      text-decoration: none;
    }

    .headerCardImage {
      width: 64px;
      height: 64px;
    }

    .headerCardDescription {
      font-size: 12.25px;
      font-weight: ${euiTheme.font.weight.regular};
      line-height: ${euiTheme.base * 1.25}px;
      color: ${euiTheme.colors.darkestShade};
    }
  `;
};
