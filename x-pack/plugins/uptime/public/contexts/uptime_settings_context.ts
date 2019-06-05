/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { createContext } from 'react';
import { UptimeAppColors } from '../uptime_app';

export interface UMSettingsContext {
  autorefreshIsPaused: boolean;
  autorefreshInterval: number;
  basePath: string;
  colors: UptimeAppColors;
  dateRangeStart: string;
  dateRangeEnd: string;
  isApmAvailable: boolean;
  isInfraAvailable: boolean;
  isLogsAvailable: boolean;
  refreshApp: () => void;
  setHeadingText: (text: string) => void;
}

/**
 * These are default values for the context. These defaults are typically
 * overwritten by the Uptime App upon its invocation.
 */
const defaultContext: UMSettingsContext = {
  autorefreshIsPaused: true,
  autorefreshInterval: 10000,
  basePath: '',
  colors: {
    success: euiLightVars.euiColorSuccess,
    range: euiLightVars.euiFocusBackgroundColor,
    mean: euiLightVars.euiColorPrimary,
    danger: euiLightVars.euiColorDanger,
  },
  dateRangeStart: 'now-15m',
  dateRangeEnd: 'now',
  isApmAvailable: true,
  isInfraAvailable: true,
  isLogsAvailable: true,
  refreshApp: () => {
    throw new Error('App refresh was not initialized, set it when you invoke the context');
  },
  setHeadingText: () => {
    throw new Error('setHeadingText was not initialized on UMSettingsContext.');
  },
};

export const UptimeSettingsContext = createContext(defaultContext);
