/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { PAGE_CONTENT_WIDTH } from '../../constants';

export const useOnboardingHeaderStyles = () => {
  const { euiTheme } = useEuiTheme();
  return css`
    .onboardingHeaderTitleWrapper {
      width: calc(${PAGE_CONTENT_WIDTH} / 2);
    }
    .onboardingHeaderGreetings {
      color: ${euiTheme.colors.darkShade};
    }
  `;
};
