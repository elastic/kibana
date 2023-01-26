/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { euiLightVars as euiThemeLight, euiDarkVars as euiThemeDark } from '@kbn/ui-theme';

import { useAiopsAppContext } from './use_aiops_app_context';

export type EuiThemeType = typeof euiThemeLight | typeof euiThemeDark;

export function useEuiTheme() {
  const { uiSettings } = useAiopsAppContext();

  return useMemo(
    () => (uiSettings.get('theme:darkMode') ? euiThemeDark : euiThemeLight),
    [uiSettings]
  );
}
