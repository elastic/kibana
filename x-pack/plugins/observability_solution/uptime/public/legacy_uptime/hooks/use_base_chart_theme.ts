/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useDarkMode } from '@kbn/kibana-react-plugin/public';
import { DARK_THEME, LIGHT_THEME, Theme } from '@elastic/charts';

export const useBaseChartTheme = (): Theme => {
  const darkMode = useDarkMode();
  return useMemo(() => {
    return darkMode ? DARK_THEME : LIGHT_THEME;
  }, [darkMode]);
};
