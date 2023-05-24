/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { euiDarkVars as euiThemeDark, euiLightVars as euiThemeLight } from '@kbn/ui-theme';
import { of } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { useDataVisualizerKibana } from '../../kibana_context';

const themeDefault = { darkMode: false };

export function useCurrentEuiTheme() {
  const {
    services: { theme },
  } = useDataVisualizerKibana();

  const themeObservable$ = useMemo(() => {
    return theme?.theme$ ?? of(themeDefault);
  }, [theme]);

  const { darkMode } = useObservable(themeObservable$, themeDefault);

  return useMemo(() => (darkMode ? euiThemeDark : euiThemeLight), [darkMode]);
}
