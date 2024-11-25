/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

import { mathWithUnits, transparentize, useEuiTheme } from '@elastic/eui';
// @ts-expect-error style types not defined
import { euiToolTipStyles } from '@elastic/eui/lib/components/tool_tip/tool_tip.styles';

import { useCurrentEuiThemeVars } from '@kbn/ml-kibana-theme';

import { useMlKibana } from '../../contexts/kibana';

export const useChartTooltipStyles = () => {
  const euiThemeContext = useEuiTheme();
  const {
    services: { theme },
  } = useMlKibana();
  const { euiTheme } = useCurrentEuiThemeVars(theme);
  const euiStyles = euiToolTipStyles(euiThemeContext);

  return {
    mlChartTooltip: css([
      euiStyles.euiToolTip,
      {
        fontSize: euiTheme.euiFontSizeXS,
        padding: 0,
        transition: `opacity ${euiTheme.euiAnimSpeedNormal}`,
        pointerEvents: 'none',
        userSelect: 'none',
        maxWidth: '512px',
        position: 'relative',
      },
    ]),
    mlChartTooltipList: css({
      margin: euiTheme.euiSizeXS,
      paddingBottom: euiTheme.euiSizeXS,
    }),
    mlChartTooltipHeader: css({
      fontWeight: euiTheme.euiFontWeightBold,
      padding: `${euiTheme.euiSizeXS} ${mathWithUnits(euiTheme.euiSizeS, (x) => x * 2)}`,
      marginBottom: euiTheme.euiSizeXS,
      borderBottom: `1px solid ${transparentize(euiTheme.euiBorderColor, 0.8)}`,
    }),
    mlChartTooltipItem: css({
      display: 'flex',
      padding: '3px',
      boxSizing: 'border-box',
      borderLeft: `${euiTheme.euiSizeXS} solid transparent`,
    }),
    mlChartTooltipLabel: css({
      minWidth: '1px',
    }),
    mlChartTooltipValue: css({
      fontWeight: euiTheme.euiFontWeightBold,
      textAlign: 'right',
      fontFeatureSettings: 'tnum',
      marginLeft: '8px',
    }),
  };
};
