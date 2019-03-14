/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import chrome from '../../../../../src/legacy/ui/public/chrome';
const IS_DARK_THEME = chrome.getUiSettingsClient().get('theme:darkMode');
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

export const euiColorForTheme = (euiColor) => {
  if (IS_DARK_THEME) {
    return euiDarkVars[euiColor];
  } else {
    return euiLightVars[euiColor];
  }
};

// These should match the sass values defined in ml/variables.scss
export const mlThemeColors = {
  mlColorUnknown: '535966',
  mlColorWarning: '#0077CC',
  mlColorMinor: '#FEC514',
  mlColorMajor: '#E2543D',
  mlColorCritical: '#DD0A73',
};
