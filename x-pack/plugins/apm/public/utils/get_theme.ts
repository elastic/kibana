/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import lightTheme from '@elastic/eui/dist/eui_theme_light.json';
import darkTheme from '@elastic/eui/dist/eui_theme_dark.json';

export type Theme = ReturnType<typeof getTheme>;

export function getTheme({ isDarkMode }: { isDarkMode: boolean }) {
  return isDarkMode ? darkTheme : lightTheme;
}
