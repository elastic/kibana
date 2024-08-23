/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme, COLOR_MODES_STANDARD } from '@elastic/eui';
import { css } from '@emotion/css';
import { useMemo } from 'react';
import { CONTENT_WIDTH, IMG_HEADER_WIDTH } from '../helpers';
import rocket from '../images/rocket.png';
import darkRocket from '../images/dark_rocket.png';

export const useDataIngestionHubHeaderStyles = () => {
  const { euiTheme, colorMode } = useEuiTheme();

  const headerBackgroundImage = useMemo(
    () => (colorMode === COLOR_MODES_STANDARD.dark ? darkRocket : rocket),
    [colorMode]
  );

  const dataIngestionHubHeaderStyles = useMemo(() => {
    return {
      headerImageStyles: css({
        backgroundImage: `url(${headerBackgroundImage})`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPositionX: 'center',
        backgroundPositionY: 'center',
        width: `${IMG_HEADER_WIDTH}px`,
        height: `${IMG_HEADER_WIDTH}px`,
      }),
      headerTitleStyles: css({
        fontSize: `${euiTheme.base}px`,
        color: euiTheme.colors.darkShade,
        fontWeight: euiTheme.font.weight.bold,
        lineHeight: euiTheme.size.l,
      }),
      headerSubtitleStyles: css({
        fontSize: `${euiTheme.base * 2.125}px`,
        color: euiTheme.colors.title,
        fontWeight: euiTheme.font.weight.bold,
        lineHeight: euiTheme.size.xxl,
      }),
      headerDescriptionStyles: css({
        fontSize: `${euiTheme.base}px`,
        color: euiTheme.colors.subduedText,
        lineHeight: euiTheme.size.l,
        fontWeight: euiTheme.font.weight.regular,
      }),
      headerContentStyles: css({
        width: `${CONTENT_WIDTH / 2}px`,
      }),
    };
  }, [
    euiTheme.base,
    euiTheme.colors.darkShade,
    euiTheme.colors.subduedText,
    euiTheme.colors.title,
    euiTheme.font.weight.bold,
    euiTheme.font.weight.regular,
    euiTheme.size.l,
    euiTheme.size.xxl,
    headerBackgroundImage,
  ]);
  return dataIngestionHubHeaderStyles;
};
