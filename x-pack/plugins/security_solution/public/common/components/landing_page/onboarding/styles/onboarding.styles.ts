/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { useMemo } from 'react';
import launch from '../images/launch.png';

// change launch image to other image!
export const useOnboardingStyles = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(
    () => ({
      wrapperStyles: css({
        margin: `0 -${euiTheme.size.l}`,
      }),
      progressSectionStyles: css({
        backgroundColor: euiTheme.colors.lightestShade,
        padding: `${euiTheme.size.xxl} ${euiTheme.size.xxl} ${euiTheme.size.m}`,
      }),
      stepsSectionStyles: css({
        padding: `0 ${euiTheme.size.xxl} ${euiTheme.size.xxxl}`,
        backgroundColor: euiTheme.colors.lightestShade,
      }),
      bannerStyles: css({
        margin: `-${euiTheme.size.l} 0`,
      }),
      calloutStyles: css({
        paddingLeft: `${euiTheme.size.xl}`,
        backgroundImage: `url(${launch})`,
        backgroundSize: '10%',
        backgroundRepeat: 'no-repeat',
        backgroundPositionX: 'right',
        backgroundPositionY: 'bottom',
      }),
    }),
    [
      euiTheme.colors.lightestShade,
      euiTheme.size.l,
      euiTheme.size.m,
      euiTheme.size.xl,
      euiTheme.size.xxl,
      euiTheme.size.xxxl,
    ]
  );
};
