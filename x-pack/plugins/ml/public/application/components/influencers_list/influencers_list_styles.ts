/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { useCurrentEuiThemeVars } from '@kbn/ml-kibana-theme';
import { mlColors } from '../../styles';
import { useMlKibana } from '../../contexts/kibana';

export const useInfluencersListStyles = () => {
  const {
    services: { theme },
  } = useMlKibana();
  const { euiTheme } = useCurrentEuiThemeVars(theme);

  return {
    influencersList: css({
      lineHeight: 1.45,
    }),
    fieldLabel: css({
      fontSize: euiTheme.euiFontSizeXS,
      textAlign: 'left',
      maxHeight: euiTheme.euiFontSizeS,
      maxWidth: 'calc(100% - 102px)',
    }),
    progress: css({
      display: 'inline-block',
      width: 'calc(100% - 34px)',
      height: '22px',
      minWidth: '70px',
      marginBottom: 0,
      color: euiTheme.euiColorDarkShade,
      backgroundColor: 'transparent',
    }),
    progressBarHolder: (barScore: number) =>
      css({
        width: `${barScore}%`,
        display: 'inline-block',
        maxWidth: `calc(100% - 28px)`,
      }),
    progressBar: (severity: string) =>
      css({
        height: `calc(${euiTheme.euiSizeXS} / 2)`,
        marginTop: euiTheme.euiSizeM,
        textAlign: 'right',
        lineHeight: '18px',
        display: 'inline-block',
        transition: 'none',
        width: `100%`,
        backgroundColor:
          severity === 'critical'
            ? mlColors.critical
            : severity === 'major'
            ? mlColors.major
            : severity === 'minor'
            ? mlColors.minor
            : mlColors.warning,
      }),
    scoreLabel: (severity: string) =>
      css({
        textAlign: 'center',
        lineHeight: '14px',
        whiteSpace: 'nowrap',
        fontSize: euiTheme.euiFontSizeXS,
        marginLeft: euiTheme.euiSizeXS,
        display: 'inline-block',
        borderColor:
          severity === 'critical'
            ? mlColors.critical
            : severity === 'major'
            ? mlColors.major
            : severity === 'minor'
            ? mlColors.minor
            : mlColors.warning,
      }),
    totalScoreLabel: css({
      width: euiTheme.euiSizeXL,
      verticalAlign: 'top',
      textAlign: 'center',
      color: euiTheme.euiColorDarkShade,
      fontSize: '11px',
      lineHeight: '14px',
      borderRadius: euiTheme.euiBorderRadius,
      padding: `calc(${euiTheme.euiSizeXS} / 2)`,
      display: 'inline-block',
      border: euiTheme.euiBorderThin,
    }),
  };
};
