/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiLightVars, euiDarkVars } from '@kbn/ui-theme';
import React, { createContext, useContext, useMemo } from 'react';
import { EUI_CHARTS_THEME_DARK, EUI_CHARTS_THEME_LIGHT } from '@elastic/eui/dist/eui_charts_theme';
import { DARK_THEME, LIGHT_THEME, PartialTheme, Theme } from '@elastic/charts';

export interface SyntheticsAppColors {
  danger: string;
  dangerBehindText: string;
  success: string;
  gray: string;
  range: string;
  mean: string;
  warning: string;
  lightestShade: string;
}

export interface SyntheticsThemeContextValues {
  colors: SyntheticsAppColors;
  chartTheme: {
    baseTheme?: Theme;
    theme?: PartialTheme;
  };
}

/**
 * These are default values for the context. These defaults are typically
 * overwritten by the Synthetics App upon its invocation.
 */
const defaultContext: SyntheticsThemeContextValues = {
  colors: {
    danger: euiLightVars.euiColorDanger,
    dangerBehindText: euiDarkVars.euiColorVis9_behindText,
    mean: euiLightVars.euiColorPrimary,
    range: euiLightVars.euiFocusBackgroundColor,
    success: euiLightVars.euiColorSuccess,
    warning: euiLightVars.euiColorWarning,
    gray: euiLightVars.euiColorLightShade,
    lightestShade: euiLightVars.euiColorLightestShade,
  },
  chartTheme: {
    baseTheme: LIGHT_THEME,
    theme: EUI_CHARTS_THEME_LIGHT.theme,
  },
};

export const SyntheticsThemeContext = createContext(defaultContext);

interface ThemeContextProps {
  darkMode: boolean;
}

export const SyntheticsThemeContextProvider: React.FC<ThemeContextProps> = ({
  darkMode,
  children,
}) => {
  let colors: SyntheticsAppColors;
  if (darkMode) {
    colors = {
      danger: euiDarkVars.euiColorVis9,
      dangerBehindText: euiDarkVars.euiColorVis9_behindText,
      mean: euiDarkVars.euiColorPrimary,
      gray: euiDarkVars.euiColorLightShade,
      range: euiDarkVars.euiFocusBackgroundColor,
      success: euiDarkVars.euiColorSuccess,
      warning: euiDarkVars.euiColorWarning,
      lightestShade: euiDarkVars.euiColorLightestShade,
    };
  } else {
    colors = {
      danger: euiLightVars.euiColorVis9,
      dangerBehindText: euiLightVars.euiColorVis9_behindText,
      mean: euiLightVars.euiColorPrimary,
      gray: euiLightVars.euiColorLightShade,
      range: euiLightVars.euiFocusBackgroundColor,
      success: euiLightVars.euiColorSuccess,
      warning: euiLightVars.euiColorWarning,
      lightestShade: euiLightVars.euiColorLightestShade,
    };
  }
  const value = useMemo(() => {
    return {
      colors,
      chartTheme: {
        baseTheme: darkMode ? DARK_THEME : LIGHT_THEME,
        theme: darkMode ? EUI_CHARTS_THEME_DARK.theme : EUI_CHARTS_THEME_LIGHT.theme,
      },
    };
  }, [colors, darkMode]);

  return <SyntheticsThemeContext.Provider value={value} children={children} />;
};

export const useSyntheticsThemeContext = () => useContext(SyntheticsThemeContext);
