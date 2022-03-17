/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext } from 'react';
import type { ScreenshotModePluginSetup } from 'src/plugins/screenshot_mode/public';

export const ScreenshotModeContext = createContext<ScreenshotModePluginSetup | undefined>(
  undefined
);
