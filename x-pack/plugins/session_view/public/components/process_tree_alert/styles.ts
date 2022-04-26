/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEuiTheme, transparentize } from '@elastic/eui';
import { CSSObject } from '@emotion/react';

interface StylesDeps {
  isInvestigated: boolean;
  isSelected: boolean;
}

export const useStyles = ({ isInvestigated, isSelected }: StylesDeps) => {
  const { euiTheme } = useEuiTheme();

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
      alignItems: 'center',
      minHeight: '20px',
      padding: `${size.xs} ${size.base}`,
      boxSizing: 'content-box',
      cursor: 'pointer',
      '&:not(:last-child)': {
        marginBottom: size.s,
      },
      background: bgColor,
      '&:hover': {
        background: hoverBgColor,
      },
    };

    const alertRowItem: CSSObject = {
      '&:first-of-type': {
        marginRight: size.m,
      },
      '&:not(:first-of-type)': {
        marginRight: size.s,
      },
    };

    const alertRuleName: CSSObject = {
      ...alertRowItem,
      maxWidth: '70%',
    };

    const alertStatus: CSSObject = {
      ...alertRowItem,
      textTransform: 'capitalize',
      '&, span': {
        cursor: 'pointer !important',
      },
    };

    return {
      alert,
      alertRowItem,
      alertRuleName,
      alertStatus,
    };
  }, [euiTheme, isInvestigated, isSelected]);

  return cached;
};
