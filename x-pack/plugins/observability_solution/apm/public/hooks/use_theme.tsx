/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  euiPaletteColorBlind,
  useEuiTheme,
  euiPaletteColorBlindBehindText,
  euiBackgroundColor,
} from '@elastic/eui';
import type { EuiThemeComputed } from '@elastic/eui';
import { COLOR_MODES_STANDARD } from '@elastic/eui';

interface EuiColorsVis {
  euiColorVis0: string;
  euiColorVis1: string;
  euiColorVis2: string;
  euiColorVis3: string;
  euiColorVis4: string;
  euiColorVis5: string;
  euiColorVis6: string;
  euiColorVis7: string;
  euiColorVis8: string;
  euiColorVis9: string;
}
interface EuiColorsVisBehindText {
  euiColorVis0BehindText: string;
  euiColorVis1BehindText: string;
  euiColorVis2BehindText: string;
  euiColorVis3BehindText: string;
  euiColorVis4BehindText: string;
  euiColorVis5BehindText: string;
  euiColorVis6BehindText: string;
  euiColorVis7BehindText: string;
  euiColorVis8BehindText: string;
  euiColorVis9BehindText: string;
}

export type UseEuiThemeWithColorsVis = EuiThemeComputed & {
  euiPaletteColorBlind: EuiColorsVis;
  euiPaletteColorBlindBehindText: EuiColorsVisBehindText;
  isDarkColorMode: boolean;
  euiBackgroundColor: string;
};

export function useTheme(): UseEuiThemeWithColorsVis {
  const { euiTheme, colorMode, modifications } = useEuiTheme();
  const euiPaletteColors = euiPaletteColorBlind();
  const euiPaletteColorsBlindBehindText = euiPaletteColorBlindBehindText();
  const isDarkColorMode = colorMode === COLOR_MODES_STANDARD.dark;
  const uiColorsVis = {
    euiPaletteColorBlind: euiPaletteColors.reduce((colors, color, index) => {
      (colors as any)[`euiColorVis${index}`] = color;
      return colors;
    }, {} as EuiColorsVis),
  };
  const euiColorsVisBehindText = {
    euiPaletteColorBlindBehindText: euiPaletteColorsBlindBehindText.reduce(
      (colors, color, index) => {
        (colors as any)[`euiColorVis${index}BehindText`] = color;
        return colors;
      },
      {} as EuiColorsVisBehindText
    ),
  };
  return {
    ...euiTheme,
    ...uiColorsVis,
    ...euiColorsVisBehindText,
    ...{ isDarkColorMode },
    ...{
      euiBackgroundColor: euiBackgroundColor({ euiTheme, colorMode, modifications }, 'primary'),
    },
  };
}
