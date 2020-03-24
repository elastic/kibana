/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Theme, LIGHT_THEME, DARK_THEME } from '@elastic/charts';

export function getChartTheme(isDarkMode: boolean): Theme {
  return isDarkMode ? DARK_THEME : LIGHT_THEME;
}
