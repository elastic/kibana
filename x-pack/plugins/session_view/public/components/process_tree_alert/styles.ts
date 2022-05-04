/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { transparentize } from '@elastic/eui';
import { CSSObject } from '@emotion/react';
import { useEuiTheme } from '../../hooks';

interface StylesDeps {
  isInvestigated: boolean;
  isSelected: boolean;
}

export const useStyles = ({ isInvestigated, isSelected }: StylesDeps) => {
  const { euiTheme, euiVars } = useEuiTheme();

  const cached = useMemo(() => {
    const { size, colors, font } = euiTheme;

    const getHighlightColors = () => {
      let bgColor = 'none';
      let hoverBgColor = `${transparentize(colors.primary, 0.04)}`;

      if (isInvestigated && isSelected) {
        bgColor = `${transparentize(colors.danger, 0.08)}`;
        hoverBgColor = `${transparentize(colors.danger, 0.12)}`;
      } else if (isInvestigated) {
        bgColor = `${transparentize(colors.danger, 0.04)}`;
        hoverBgColor = `${transparentize(colors.danger, 0.12)}`;
      } else if (isSelected) {
        bgColor = `${transparentize(colors.primary, 0.08)}`;
        hoverBgColor = `${transparentize(colors.primary, 0.12)}`;
      }

      return { bgColor, hoverBgColor };
    };

    const { bgColor, hoverBgColor } = getHighlightColors();

    const alert: CSSObject = {
      fontFamily: font.family,
      display: 'flex',
      gap: size.s,
      alignItems: 'center',
      padding: `0 ${size.base}`,
      boxSizing: 'content-box',
      cursor: 'pointer',
      '&:not(:last-child)': {
        marginBottom: size.s,
      },
      background: bgColor,
      '&:hover': {
        background: hoverBgColor,
      },
      '&& button': {
        flexShrink: 0,
        marginRight: size.s,
        '&:hover, &:focus, &:focus-within': {
          backgroundColor: transparentize(euiVars.buttonsBackgroundNormalDefaultPrimary, 0.2),
        },
      },
    };

    const alertStatus: CSSObject = {
      textTransform: 'capitalize',
    };

    const alertName: CSSObject = {
      padding: `${size.xs} 0`,
      color: colors.title,
    };

    return {
      alert,
      alertStatus,
      alertName,
    };
  }, [euiTheme, isInvestigated, isSelected, euiVars]);

  return cached;
};
