/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEuiTheme, transparentize } from '@elastic/eui';
import { euiLightVars as theme } from '@kbn/ui-theme';
import { CSSObject } from '@emotion/react';

export const useButtonStyles = () => {
  const { euiTheme } = useEuiTheme();

  const cached = useMemo(() => {
    const { colors, border, font, size } = euiTheme;

    const button: CSSObject = {
      background: transparentize(theme.euiColorVis6, 0.04),
      border: `${border.width.thin} solid ${transparentize(theme.euiColorVis6, 0.48)}`,
      lineHeight: '18px',
      height: '20px',
      fontSize: '11px',
      fontFamily: font.familyCode,
      borderRadius: border.radius.medium,
      color: colors.text,
      marginLeft: size.s,
      minWidth: 0,
    };

    const buttonArrow: CSSObject = {
      marginLeft: size.s,
    };

    const alertButton: CSSObject = {
      ...button,
      background: transparentize(colors.dangerText, 0.04),
      border: `${border.width.thin} solid ${transparentize(colors.dangerText, 0.48)}`,
    };

    const userChangedButton: CSSObject = {
      ...button,
      background: transparentize(theme.euiColorVis1, 0.04),
      border: `${border.width.thin} solid ${transparentize(theme.euiColorVis1, 0.48)}`,
    };

    const getExpandedIcon = (expanded: boolean) => {
      return expanded ? 'arrowUp' : 'arrowDown';
    };

    return {
      buttonArrow,
      button,
      alertButton,
      userChangedButton,
      getExpandedIcon,
    };
  }, [euiTheme]);

  return cached;
};
