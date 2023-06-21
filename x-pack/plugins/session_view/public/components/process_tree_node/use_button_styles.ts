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

export const useButtonStyles = () => {
  const { euiTheme, euiVars } = useEuiTheme();

  const cached = useMemo(() => {
    const { border, colors, size, font } = euiTheme;

    const button: CSSObject = {
      lineHeight: '18px',
      height: '20px',
      fontSize: size.m,
      fontFamily: font.family,
      fontWeight: font.weight.medium,
      borderRadius: border.radius.small,
      marginLeft: size.xs,
      marginRight: size.xs,
      minWidth: 0,
      padding: `${size.s} ${size.xxs}`,
      color: euiVars.euiColorVis6_asText,
      background: transparentize(euiVars.euiColorVis6, 0.04),
      border: `${border.width.thin} solid ${transparentize(euiVars.euiColorVis6, 0.48)}`,
      '&& > span': {
        padding: `0px ${size.xxs}`,
        svg: {
          transition: `transform ${euiTheme.animation.extraFast}`,
        },
      },
      '&&:hover, &&:focus': {
        background: transparentize(euiVars.euiColorVis6, 0.12),
        textDecoration: 'none',
      },
      '&.isExpanded > span svg:not(.alertIcon)': {
        transform: `rotate(180deg)`,
      },
      '&.isExpanded': {
        color: colors.ghost,
        background: euiVars.euiColorVis6,
        '&:hover, &:focus': {
          background: euiVars.euiColorVis6,
        },
      },
    };

    const buttonArrow: CSSObject = {
      marginLeft: size.xs,
    };
    const alertButton: CSSObject = {
      ...button,
      color: euiVars.euiColorDanger,
      background: transparentize(euiVars.euiColorDanger, 0.04),
      border: `${border.width.thin} solid ${transparentize(euiVars.euiColorDanger, 0.48)}`,
      '&&:hover, &&:focus': {
        background: transparentize(euiVars.euiColorDanger, 0.12),
        textDecoration: 'none',
      },
      '&.isExpanded': {
        color: colors.ghost,
        background: euiVars.euiColorDanger,
        '&:hover, &:focus': {
          background: `${euiVars.euiColorDanger}`,
        },
      },

      '& .euiButton__text': {
        display: 'flex',
        alignItems: 'center',
        ' .alertIcon': {
          marginLeft: '4px',
        },
      },
    };

    const outputButton: CSSObject = {
      ...button,
      color: euiVars.euiColorVis1,
      background: transparentize(euiVars.euiColorVis1, 0.04),
      border: `${border.width.thin} solid ${transparentize(euiVars.euiColorVis1, 0.48)}`,
      '&&:hover, &&:focus': {
        background: transparentize(euiVars.euiColorVis1, 0.12),
        textDecoration: 'none',
      },
      '&.isExpanded': {
        color: colors.ghost,
        background: euiVars.euiColorVis1,
        '&:hover, &:focus': {
          background: `${euiVars.euiColorVis1}`,
        },
      },
    };

    const userChangedButton: CSSObject = {
      ...button,
      cursor: 'default',
      color: euiVars.euiColorGhost,
      background: euiVars.euiColorVis3,
      border: `${border.width.thin} solid ${transparentize(euiVars.euiColorVis3, 0.48)}`,
      '&&:hover, &&:focus': {
        color: euiVars.euiColorGhost,
        background: euiVars.euiColorVis3,
        textDecoration: 'none',
        transform: 'none',
        animation: 'none',
      },
    };

    const buttonSize: CSSObject = {
      padding: `0px ${euiTheme.size.xs}`,
    };

    return {
      buttonArrow,
      button,
      alertButton,
      outputButton,
      userChangedButton,
      buttonSize,
    };
  }, [euiTheme, euiVars]);

  return cached;
};
