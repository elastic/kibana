/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';

export const useDataIngestionHubHeaderCardStyles = () => {
  const { euiTheme, colorMode } = useEuiTheme();
  const isDarkMode = colorMode === 'DARK';

  const cardStyle = useMemo(() => {
    const cardBaseStyle = { minWidth: '315px' };
    return isDarkMode
      ? css({
          ...cardBaseStyle,
          backgroundColor: `${euiTheme.colors.lightestShade}`,
          boxShadow: 'none',
          border: `1px solid ${euiTheme.colors.mediumShade}`,
        })
      : css(cardBaseStyle);
  }, [isDarkMode, euiTheme]);

  const dataIngestionHubHeaderCardStyles = useMemo(() => {
    return {
      cardStyle,
      cardTitleStyle: css({
        fontSize: `${euiTheme.base * 0.875}px`,
        fontWeight: euiTheme.font.weight.semiBold,
        lineHeight: euiTheme.size.l,
        color: euiTheme.colors.title,
      }),
      cardDescriptionStyle: css({
        fontSize: '12.25px',
        fontWeight: euiTheme.font.weight.regular,
        lineHeight: `${euiTheme.base * 1.25}px`,
        color: euiTheme.colors.darkestShade,
      }),
      cardLinkStyle: css({
        fontSize: euiTheme.size.m,
        fontWeight: euiTheme.font.weight.medium,
        lineHeight: euiTheme.size.base,
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
    cardStyle,
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

  return dataIngestionHubHeaderCardStyles;
};
