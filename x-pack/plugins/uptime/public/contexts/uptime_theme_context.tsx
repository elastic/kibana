/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import React, { createContext, useMemo } from 'react';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { EUI_CHARTS_THEME_DARK, EUI_CHARTS_THEME_LIGHT } from '@elastic/eui/dist/eui_charts_theme';
import { DARK_THEME, LIGHT_THEME, PartialTheme, Theme } from '@elastic/charts';
import { UptimeAppColors } from '../uptime_app';

export interface UptimeThemeContextValues {
  colors: UptimeAppColors;
  chartTheme: {
    baseTheme?: Theme;
    theme?: PartialTheme;
  };
}

/**
 * These are default values for the context. These defaults are typically
 * overwritten by the Uptime App upon its invocation.
 */
const defaultContext: UptimeThemeContextValues = {
  colors: {
    danger: euiLightVars.euiColorDanger,
    mean: euiLightVars.euiColorPrimary,
    range: euiLightVars.euiFocusBackgroundColor,
    success: euiLightVars.euiColorSuccess,
    warning: euiLightVars.euiColorWarning,
    gray: euiLightVars.euiColorLightShade,
  },
  chartTheme: {
    baseTheme: LIGHT_THEME,
    theme: EUI_CHARTS_THEME_LIGHT.theme,
  },
};

export const UptimeThemeContext = createContext(defaultContext);

interface ThemeContextProps {
  darkMode: boolean;
}

export const UptimeThemeContextProvider: React.FC<ThemeContextProps> = ({ darkMode, children }) => {
  let colors: UptimeAppColors;
  if (darkMode) {
    colors = {
      danger: euiDarkVars.euiColorDanger,
      mean: euiDarkVars.euiColorPrimary,
      gray: euiDarkVars.euiColorLightShade,
      range: euiDarkVars.euiFocusBackgroundColor,
      success: euiDarkVars.euiColorSuccess,
      warning: euiDarkVars.euiColorWarning,
    };
  } else {
    colors = {
      danger: euiLightVars.euiColorDanger,
      mean: euiLightVars.euiColorPrimary,
      gray: euiLightVars.euiColorLightShade,
      range: euiLightVars.euiFocusBackgroundColor,
      success: euiLightVars.euiColorSuccess,
      warning: euiLightVars.euiColorWarning,
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

  return <UptimeThemeContext.Provider value={value} children={children} />;
};
