/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { createContext } from 'react';
import { UptimeAppColors } from './uptime_app';

interface UMContext {
  autorefreshIsPaused: boolean;
  autorefreshInterval: number;
  basePath: string;
  colors: UptimeAppColors;
  dateRangeStart: string;
  dateRangeEnd: string;
  lastRefresh: number;
  refreshApp: () => void;
  setHeadingText?: (text: string) => void;
}

const colors: UptimeAppColors = {
  success: euiLightVars.euiColorSuccess,
  range: euiLightVars.euiFocusBackgroundColor,
  mean: euiLightVars.euiColorPrimary,
  danger: euiLightVars.euiColorDanger,
};

const defaultContext: UMContext = {
  autorefreshIsPaused: true,
  autorefreshInterval: 10000,
  basePath: '',
  colors,
  dateRangeStart: 'now-15m',
  dateRangeEnd: 'now',
  lastRefresh: 0,
  refreshApp: () => {
    throw new Error('App refresh was not initialized, set it when you invoke the context');
  },
};

export const UptimeContext = createContext(defaultContext);
