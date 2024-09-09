/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiBackgroundColor, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';

export const HEIGHT_ANIMATION_DURATION = 250;

export const useCardPanelStyles = () => {
  const { euiTheme } = useEuiTheme();
  const completeStepBackgroundColor = useEuiBackgroundColor('success');

  return css`
    .onboardingCardHeader {
      padding: ${euiTheme.size.l};
      cursor: pointer;
    }
    .onboardingCardHeaderTitle {
      font-weight: ${euiTheme.font.weight.semiBold};
    }
    .onboardingCardHeaderCompleteBadge {
      background-color: ${completeStepBackgroundColor};
      color: ${euiTheme.colors.successText};
    }
    .onboardingCardContentWrapper {
      display: grid;
      grid-template-rows: 1fr;
      visibility: visible;
      transition: grid-template-rows ${HEIGHT_ANIMATION_DURATION}ms ease-in,
        visibility ${euiTheme.animation.normal} ${euiTheme.animation.resistance};
    }
    &.onboardingCardPanel-collapsed .onboardingCardContentWrapper {
      visibility: collapse;
      grid-template-rows: 0fr;
    }
    .onboardingCardContent {
      overflow: hidden;
    }
  `;
};
