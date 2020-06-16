/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';

type ThemeInterface = typeof euiDarkVars;

declare module 'styled-components' {
  interface DefaultTheme {
    eui: ThemeInterface;
    darkMode: boolean;
  }
}
