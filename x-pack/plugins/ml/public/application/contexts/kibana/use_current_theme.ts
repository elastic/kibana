/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useObservable from 'react-use/lib/useObservable';
import { of } from 'rxjs';
import { useMemo } from 'react';
import { euiDarkVars as euiThemeDark, euiLightVars as euiThemeLight } from '@kbn/ui-theme';
import { useMlKibana } from './kibana_context';

/**
 * Indicates if the currently applied theme is either dark or light.
 * @return {boolean} - Returns true if the currently applied theme is dark.
 */
export function useCurrentKibanaTheme() {
  const themeDefault = { darkMode: false };

  const {
    services: { theme },
  } = useMlKibana();

  const { darkMode } = useObservable(theme?.theme$ ?? of(themeDefault), themeDefault);

  return darkMode;
}

/**
 * Returns an EUI theme definition based on the currently applied theme.
 */
export function useCurrentEuiTheme() {
  const isDarkMode = useCurrentKibanaTheme();
  return useMemo(() => ({ euiTheme: isDarkMode ? euiThemeDark : euiThemeLight }), [isDarkMode]);
}
