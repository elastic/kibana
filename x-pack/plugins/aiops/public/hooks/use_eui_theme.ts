/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { euiLightVars as euiThemeLight, euiDarkVars as euiThemeDark } from '@kbn/ui-theme';

import { useAiOpsKibana } from '../kibana_context';

export type EuiThemeType = typeof euiThemeLight | typeof euiThemeDark;

export function useEuiTheme() {
  const {
    services: { uiSettings },
  } = useAiOpsKibana();

  return useMemo(
    () => (uiSettings.get('theme:darkMode') ? euiThemeDark : euiThemeLight),
    [uiSettings]
  );
}
