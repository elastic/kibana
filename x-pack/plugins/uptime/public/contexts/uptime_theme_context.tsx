/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import React, { createContext, useMemo } from 'react';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { UptimeAppColors } from '../apps/uptime_app';

export interface UptimeThemeContextValues {
  colors: UptimeAppColors;
}

/**
 * These are default values for the context. These defaults are typically
 * overwritten by the Uptime App upon its invocation.
 */
const defaultContext: UptimeThemeContextValues = {
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
};

export const UptimeThemeContext = createContext(defaultContext);

interface ThemeContextProps {
  darkMode: boolean;
}

export const UptimeThemeContextProvider: React.FC<ThemeContextProps> = ({ darkMode, children }) => {
  let colors: UptimeAppColors;
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
    return { colors };
  }, [colors]);

  return <UptimeThemeContext.Provider value={value} children={children} />;
};
