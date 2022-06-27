/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import d3 from 'd3';
import { useMemo } from 'react';
import { euiLightVars as euiThemeLight, euiDarkVars as euiThemeDark } from '@kbn/ui-theme';

import { i18n } from '@kbn/i18n';

import { useUiSettings } from '../../contexts/kibana/use_ui_settings_context';

/**
 * Custom color scale factory that takes the amount of feature influencers
 * into account to adjust the contrast of the color range. This is used for
 * color coding for outlier detection where the amount of feature influencers
 * affects the threshold from which the influencers value can actually be
 * considered influential.
 *
 * @param n number of influencers
 * @returns a function suitable as a preprocessor for d3.scale.linear()
 */
export const influencerColorScaleFactory = (n: number) => (t: number) => {
  // for 1 influencer or less we fall back to a plain linear scale.
  if (n <= 1) {
    return t;
  }

  if (t < 1 / n) {
    return 0;
  }
  if (t < 3 / n) {
    return (n / 4) * (t - 1 / n);
  }
  return 0.5 + (t - 3 / n);
};

export enum COLOR_RANGE_SCALE {
  LINEAR = 'linear',
  INFLUENCER = 'influencer',
  SQRT = 'sqrt',
}

/**
 * Color range scale options in the format for EuiSelect's options prop.
 */
export const colorRangeScaleOptions = [
  {
    value: COLOR_RANGE_SCALE.LINEAR,
    text: i18n.translate('xpack.ml.components.colorRangeLegend.linearScaleLabel', {
      defaultMessage: 'Linear',
    }),
  },
  {
    value: COLOR_RANGE_SCALE.INFLUENCER,
    text: i18n.translate('xpack.ml.components.colorRangeLegend.influencerScaleLabel', {
      defaultMessage: 'Influencer custom scale',
    }),
  },
  {
    value: COLOR_RANGE_SCALE.SQRT,
    text: i18n.translate('xpack.ml.components.colorRangeLegend.sqrtScaleLabel', {
      defaultMessage: 'Sqrt',
    }),
  },
];

export enum COLOR_RANGE {
  BLUE = 'blue',
  RED = 'red',
  RED_GREEN = 'red-green',
  GREEN_RED = 'green-red',
  YELLOW_GREEN_BLUE = 'yellow-green-blue',
}

/**
 * Color range options in the format for EuiSelect's options prop.
 */
export const colorRangeOptions = [
  {
    value: COLOR_RANGE.BLUE,
    text: i18n.translate('xpack.ml.components.colorRangeLegend.blueColorRangeLabel', {
      defaultMessage: 'Blue',
    }),
  },
  {
    value: COLOR_RANGE.RED,
    text: i18n.translate('xpack.ml.components.colorRangeLegend.redColorRangeLabel', {
      defaultMessage: 'Red',
    }),
  },
  {
    value: COLOR_RANGE.RED_GREEN,
    text: i18n.translate('xpack.ml.components.colorRangeLegend.redGreenColorRangeLabel', {
      defaultMessage: 'Red - Green',
    }),
  },
  {
    value: COLOR_RANGE.GREEN_RED,
    text: i18n.translate('xpack.ml.components.colorRangeLegend.greenRedColorRangeLabel', {
      defaultMessage: 'Green - Red',
    }),
  },
  {
    value: COLOR_RANGE.YELLOW_GREEN_BLUE,
    text: i18n.translate('xpack.ml.components.colorRangeLegend.yellowGreenBlueColorRangeLabel', {
      defaultMessage: 'Yellow - Green - Blue',
    }),
  },
];

/**
 * A custom Yellow-Green-Blue color range to demonstrate the support
 * for more complex ranges with more than two colors.
 */
const coloursYGB = [
  '#FFFFDD',
  '#AAF191',
  '#80D385',
  '#61B385',
  '#3E9583',
  '#217681',
  '#285285',
  '#1F2D86',
  '#000086',
];
const colourRangeYGB = d3.range(0, 1, 1.0 / (coloursYGB.length - 1));
colourRangeYGB.push(1);

const colorDomains = {
  [COLOR_RANGE.BLUE]: [0, 1],
  [COLOR_RANGE.RED]: [0, 1],
  [COLOR_RANGE.RED_GREEN]: [0, 1],
  [COLOR_RANGE.GREEN_RED]: [0, 1],
  [COLOR_RANGE.YELLOW_GREEN_BLUE]: colourRangeYGB,
};

/**
 * Custom hook to get a d3 based color range to be used for color coding in table cells.
 *
 * @param colorRange COLOR_RANGE enum.
 * @param colorRangeScale COLOR_RANGE_SCALE enum.
 * @param featureCount
 */
export const useColorRange = (
  colorRange = COLOR_RANGE.BLUE,
  colorRangeScale = COLOR_RANGE_SCALE.LINEAR,
  featureCount = 1
) => {
  const { euiTheme } = useCurrentEuiTheme();

  const colorRanges: Record<COLOR_RANGE, string[]> = {
    [COLOR_RANGE.BLUE]: [
      d3.rgb(euiTheme.euiColorEmptyShade).toString(),
      d3.rgb(euiTheme.euiColorVis1).toString(),
    ],
    [COLOR_RANGE.RED]: [
      d3.rgb(euiTheme.euiColorEmptyShade).toString(),
      d3.rgb(euiTheme.euiColorDanger).toString(),
    ],
    [COLOR_RANGE.RED_GREEN]: ['red', 'green'],
    [COLOR_RANGE.GREEN_RED]: ['green', 'red'],
    [COLOR_RANGE.YELLOW_GREEN_BLUE]: coloursYGB,
  };

  const linearScale = d3.scale
    .linear<string>()
    .domain(colorDomains[colorRange])
    .range(colorRanges[colorRange]);
  const influencerColorScale = influencerColorScaleFactory(featureCount);
  const influencerScaleLinearWrapper = (n: number) => linearScale(influencerColorScale(n));

  const scaleTypes = {
    [COLOR_RANGE_SCALE.LINEAR]: linearScale,
    [COLOR_RANGE_SCALE.INFLUENCER]: influencerScaleLinearWrapper,
    [COLOR_RANGE_SCALE.SQRT]: d3.scale
      .sqrt<string>()
      .domain(colorDomains[colorRange])
      // typings for .range() incorrectly don't allow passing in a color extent.
      // @ts-ignore
      .range(colorRanges[colorRange]),
  };

  return scaleTypes[colorRangeScale];
};

export type EuiThemeType = typeof euiThemeLight | typeof euiThemeDark;

export function useCurrentEuiTheme() {
  const uiSettings = useUiSettings();
  return useMemo(
    () => ({ euiTheme: uiSettings.get('theme:darkMode') ? euiThemeDark : euiThemeLight }),
    [uiSettings]
  );
}
