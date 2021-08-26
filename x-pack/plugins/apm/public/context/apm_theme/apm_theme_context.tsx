/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { DefaultTheme, ThemeProvider } from 'styled-components';
import { useUiSetting$ } from '../../../../../../src/plugins/kibana_react/public';

export function ApmThemeProvider({ children }: { children: React.ReactNode }) {
  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

  return (
    <ThemeProvider
      theme={(outerTheme?: DefaultTheme) => ({
        ...outerTheme,
        eui: darkMode ? euiDarkVars : euiLightVars,
        darkMode,
      })}
    >
      {children}
    </ThemeProvider>
  );
}
