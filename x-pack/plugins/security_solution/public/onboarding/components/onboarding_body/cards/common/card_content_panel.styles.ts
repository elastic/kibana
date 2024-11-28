/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';
import { COLOR_MODES_STANDARD, useEuiTheme } from '@elastic/eui';
import { useDarkPanelStyles } from '../../onboarding_card_panel.styles';

export const NESTED_PANEL_CLASS_NAME = 'onboardingCardContentPanelNested';

export const useCardContentPanelStyles = () => {
  const { euiTheme, colorMode } = useEuiTheme();
  const isDarkMode = colorMode === COLOR_MODES_STANDARD.dark;
  const darkModeStyles = useDarkPanelStyles(isDarkMode);

  return css`
    padding-top: 0;
    ${darkModeStyles}

    .${NESTED_PANEL_CLASS_NAME} {
      padding-top: ${euiTheme.size.s};
      ${darkModeStyles}
    }
  `;
};
