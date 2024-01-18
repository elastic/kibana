/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { useMemo } from 'react';
import launch from '../images/launch.png';

export const useWelcomeHeaderStyles = () => {
  const { euiTheme } = useEuiTheme();

  const welcomeHeaderStyles = useMemo(() => {
    return {
      headerStyles: `background-image: url(${launch});
        background-size: 40%;
        background-repeat: no-repeat;
        background-position-x: right;
        background-position-y: center;
        padding: ${euiTheme.base * 0.625}px 0;
      `,
      headerTitleStyles: `
        padding-bottom: ${euiTheme.size.s};
        font-size: ${euiTheme.base}px;
        color: ${euiTheme.colors.darkShade};
        font-weight: ${euiTheme.font.weight.bold};
        line-height: ${euiTheme.size.l};
      `,
      headerSubtitleStyles: `
        font-size: ${euiTheme.base * 2.125}px;
        color: ${euiTheme.colors.title};
        font-weight: ${euiTheme.font.weight.bold};
      `,
      headerDescriptionStyles: `
        font-size: ${euiTheme.base}px;
        color: ${euiTheme.colors.subduedText};
        line-height: ${euiTheme.size.l};
        font-weight: ${euiTheme.font.weight.regular};
      `,
      currentPlanWrapperStyles: `
        background-color: ${euiTheme.colors.lightestShade};
        border-radius: 56px;
        padding: ${euiTheme.size.xs} ${euiTheme.size.s} ${euiTheme.size.xs} ${euiTheme.size.m};
        height: ${euiTheme.size.xl};
      `,
      currentPlanTextStyles: `
        font-size: ${euiTheme.size.m};
        font-weight: ${euiTheme.font.weight.bold};
        padding-right: ${euiTheme.size.xs};
      `,
    };
  }, [
    euiTheme.base,
    euiTheme.colors.darkShade,
    euiTheme.colors.lightestShade,
    euiTheme.colors.subduedText,
    euiTheme.colors.title,
    euiTheme.font.weight.bold,
    euiTheme.font.weight.regular,
    euiTheme.size.l,
    euiTheme.size.m,
    euiTheme.size.s,
    euiTheme.size.xl,
    euiTheme.size.xs,
  ]);
  return welcomeHeaderStyles;
};
