/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { useMemo } from 'react';
import { CONTENT_WIDTH } from '../helpers';
import launch from '../images/launch.png';

export const useWelcomeHeaderStyles = () => {
  const { euiTheme } = useEuiTheme();

  const welcomeHeaderStyles = useMemo(() => {
    return {
      headerStyles: css({
        backgroundImage: `url(${launch})`,
        backgroundSize: '40%',
        backgroundRepeat: 'no-repeat',
        backgroundPositionX: 'right',
        backgroundPositionY: 'center',
        padding: `${euiTheme.base * 0.625}px 0`,
      }),
      headerTitleStyles: css({
        paddingBottom: euiTheme.size.s,
        fontSize: `${euiTheme.base}px`,
        color: euiTheme.colors.darkShade,
        fontWeight: euiTheme.font.weight.bold,
        lineHeight: euiTheme.size.l,
      }),
      headerSubtitleStyles: css({
        fontSize: `${euiTheme.base * 2.125}px`,
        color: euiTheme.colors.title,
        fontWeight: euiTheme.font.weight.bold,
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
      currentPlanWrapperStyles: css({
        backgroundColor: euiTheme.colors.lightestShade,
        borderRadius: '56px',
        padding: `${euiTheme.size.xs} ${euiTheme.size.s} ${euiTheme.size.xs} ${euiTheme.size.m}`,
        height: euiTheme.size.xl,
      }),
      currentPlanTextStyles: css({
        fontSize: euiTheme.size.m,
        fontWeight: euiTheme.font.weight.bold,
        paddingRight: euiTheme.size.xs,
      }),
      projectFeaturesUrlStyles: css({
        paddingLeft: euiTheme.size.xs,
      }),
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
