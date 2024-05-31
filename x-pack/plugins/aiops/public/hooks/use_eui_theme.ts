/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCurrentEuiThemeVars, useIsDarkTheme as useIsDarkThemeMl } from '@kbn/ml-kibana-theme';
import { useAiopsAppContext } from './use_aiops_app_context';

export function useEuiTheme() {
  const { theme } = useAiopsAppContext();
  return useCurrentEuiThemeVars(theme).euiTheme;
}

export function useIsDarkTheme() {
  const { theme } = useAiopsAppContext();
  return useIsDarkThemeMl(theme);
}
