/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COLOR_MODES_STANDARD, useEuiBackgroundColor, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';

export const HEIGHT_ANIMATION_DURATION = 250;

export const useCardPanelStyles = () => {
  const { euiTheme, colorMode } = useEuiTheme();
  const successBackgroundColor = useEuiBackgroundColor('success');
  const isDarkMode = colorMode === COLOR_MODES_STANDARD.dark;

  return css`
    .onboardingCardHeader {
      padding: calc(${euiTheme.size.s} * 2);
      cursor: pointer;
    }
    .onboardingCardIcon {
      padding: ${euiTheme.size.m};
      border-radius: 50%;
      background-color: ${isDarkMode ? euiTheme.colors.body : euiTheme.colors.lightestShade};
    }
    .onboardingCardHeaderTitle {
      font-weight: ${euiTheme.font.weight.semiBold};
    }
    .onboardingCardHeaderCompleteBadge {
      background-color: ${successBackgroundColor};
      color: ${euiTheme.colors.successText};
    }
    .onboardingCardContentWrapper {
      display: grid;
      visibility: collapse;
      grid-template-rows: 0fr;
      transition: grid-template-rows ${HEIGHT_ANIMATION_DURATION}ms ease-in,
        visibility ${euiTheme.animation.normal} ${euiTheme.animation.resistance};
    }
    .onboardingCardContent {
      overflow: hidden;
    }

    &.onboardingCardPanel-expanded {
      border: 2px solid ${euiTheme.colors.primary};

      .onboardingCardContentWrapper {
        visibility: visible;
        grid-template-rows: 1fr;
      }
    }

    &.onboardingCardPanel-completed {
      .onboardingCardIcon {
        background-color: ${successBackgroundColor};
      }
    }
    ${isDarkMode
      ? `
          background-color: ${euiTheme.colors.lightestShade};
          border: 1px solid ${euiTheme.colors.mediumShade};
        `
      : ''}
  `;
};
