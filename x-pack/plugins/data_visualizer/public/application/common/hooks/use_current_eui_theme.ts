/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { euiDarkVars as euiThemeDark, euiLightVars as euiThemeLight } from '@kbn/ui-theme';
import { useDataVisualizerKibana } from '../../kibana_context';

export function useCurrentEuiTheme() {
  const { services } = useDataVisualizerKibana();
  const uiSettings = services.uiSettings;
  return useMemo(
    () => (uiSettings.get('theme:darkMode') ? euiThemeDark : euiThemeLight),
    [uiSettings]
  );
}
