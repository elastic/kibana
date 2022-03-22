/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEuiTheme, transparentize, shade } from '@elastic/eui';
import { euiLightVars as theme } from '@kbn/ui-theme';
import { CSSObject } from '@emotion/react';

interface ButtonStylesDeps {
  isExpanded?: boolean;
}

export const useButtonStyles = ({ isExpanded }: ButtonStylesDeps) => {
  const { euiTheme } = useEuiTheme();

  const cached = useMemo(() => {
    const { colors, border, size } = euiTheme;

    const button: CSSObject = {
      background: transparentize(theme.euiColorVis6, 0.04),
      border: `${border.width.thin} solid ${transparentize(theme.euiColorVis6, 0.48)}`,
      lineHeight: '18px',
      height: '20px',
      fontSize: size.m,
      borderRadius: border.radius.medium,
      color: shade(theme.euiColorVis6, 0.25),
      marginLeft: size.s,
      minWidth: 0,
    };

    const buttonArrow: CSSObject = {
      marginLeft: size.s,
    };

    const alertButton: CSSObject = {
      ...button,
      color: colors.dangerText,
      background: transparentize(colors.dangerText, 0.04),
      border: `${border.width.thin} solid ${transparentize(colors.dangerText, 0.48)}`,
    };

    const alertsCountNumber: CSSObject = {
      paddingLeft: size.xs,
    };

    if (isExpanded) {
      button.color = colors.ghost;
      button.background = theme.euiColorVis6;
      button['&:hover, &:focus'] = {
        backgroundColor: `${theme.euiColorVis6} !important`,
      };

      alertButton.color = colors.ghost;
      alertButton.background = colors.dangerText;
      alertButton['&:hover, &:focus'] = {
        backgroundColor: `${colors.dangerText} !important`,
      };
    }

    const userChangedButton: CSSObject = {
      ...button,
      color: theme.euiColorVis3,
      background: transparentize(theme.euiColorVis3, 0.04),
      border: `${border.width.thin} solid ${transparentize(theme.euiColorVis3, 0.48)}`,
    };

    const userChangedButtonUsername: CSSObject = {
      textTransform: 'capitalize',
    };

    const expandedIcon = isExpanded ? 'arrowUp' : 'arrowDown';

    return {
      buttonArrow,
      button,
      alertButton,
      alertsCountNumber,
      userChangedButton,
      userChangedButtonUsername,
      expandedIcon,
    };
  }, [euiTheme, isExpanded]);

  return cached;
};
