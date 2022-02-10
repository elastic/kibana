/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiLightVars as lightTheme, euiDarkVars as darkTheme } from '@kbn/ui-theme';

import { DEFAULT_DARK_MODE } from '../../../../common/constants';
import { useUiSetting$ } from '../kibana';

export const useEuiTheme = () => {
  const [darkMode] = useUiSetting$<boolean>(DEFAULT_DARK_MODE);
  return darkMode ? darkTheme : lightTheme;
};
