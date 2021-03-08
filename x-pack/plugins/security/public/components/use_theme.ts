/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import euiThemeDark from '@elastic/eui/dist/eui_theme_dark.json';
import euiThemeLight from '@elastic/eui/dist/eui_theme_light.json';

import { useUiSetting } from '../../../../../src/plugins/kibana_react/public';

/**
 * Returns correct EUI theme depending on dark mode setting.
 *
 * @example
 * ```typescript
 * const theme = useTheme();
 *
 * <EuiCode style={{ color: theme.euiColorSuccessText }}>
 *   {props.value}
 * </EuiCode>
 * ```
 */
export function useTheme() {
  const darkMode = useUiSetting<boolean>('theme:darkMode');
  return darkMode ? euiThemeDark : euiThemeLight;
}
