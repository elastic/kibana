/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { COLOR_MODES_STANDARD, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';

export const useCardStyles = () => {
  const { euiTheme, colorMode } = useEuiTheme();
  const isDarkMode = colorMode === COLOR_MODES_STANDARD.dark;

  const cardBodyStyle = useMemo(() => {
    const cardBaseStyle = {
      minWidth: '315px',
      ':hover': {
        '.css-g3povl-euiCard__text-left-interactive': {
          textDecoration: 'none',
        },
        '.euiButtonEmpty': {
          textDecoration: 'underline',
        },
        '.euiLink': {
          textDecoration: 'underline',
        },
      },
    };
    return isDarkMode
      ? css({
          ...cardBaseStyle,
          backgroundColor: `${euiTheme.colors.lightestShade}`,
          boxShadow: 'none',
          border: `1px solid ${euiTheme.colors.mediumShade}`,
        })
      : css(cardBaseStyle);
  }, [isDarkMode, euiTheme]);

  const cardStyles = useMemo(() => {
    return {
      cardBodyStyle,
      cardTitleStyle: css({
        fontSize: `${euiTheme.base * 0.875}px`,
        fontWeight: euiTheme.font.weight.semiBold,
        lineHeight: euiTheme.size.l,
        color: euiTheme.colors.title,
        textDecoration: 'none',
      }),
      cardDescriptionStyle: css({
        fontSize: '12.25px',
        fontWeight: euiTheme.font.weight.regular,
        lineHeight: `${euiTheme.base * 1.25}px`,
        color: euiTheme.colors.darkestShade,
      }),
      cardButtonStyle: css({
        padding: '0px',
        height: 'auto',
        fontSize: euiTheme.size.m,
        fontWeight: euiTheme.font.weight.medium,
        lineHeight: euiTheme.size.base,
        ':focus': {
          backgroundColor: 'transparent',
        },
      }),
    };
  }, [
    cardBodyStyle,
    euiTheme.base,
    euiTheme.colors.darkestShade,
    euiTheme.colors.title,
    euiTheme.font.weight.medium,
    euiTheme.font.weight.regular,
    euiTheme.font.weight.semiBold,
    euiTheme.size.base,
    euiTheme.size.l,
    euiTheme.size.m,
  ]);

  return cardStyles;
};
