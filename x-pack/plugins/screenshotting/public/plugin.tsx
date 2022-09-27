/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import type { AppMountParameters, CoreSetup, Plugin } from '@kbn/core/public';
import type { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import type { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/public';
import { AppNavLinkStatus } from '@kbn/core/public';
import { SCREENSHOTTING_APP_ID } from '../common';
import { App, ScreenshotModeContext } from './app';

interface SetupDeps {
  expressions: ExpressionsSetup;
  screenshotMode: ScreenshotModePluginSetup;
}

export class ScreenshottingPlugin implements Plugin<void, void, SetupDeps> {
  setup({ application }: CoreSetup, { screenshotMode }: SetupDeps) {
    if (!screenshotMode.isScreenshotMode()) {
      return;
    }

    application.register({
      id: SCREENSHOTTING_APP_ID,
      title: 'Screenshotting Expressions Renderer',
      navLinkStatus: AppNavLinkStatus.hidden,
      chromeless: true,

      mount: async ({ element }: AppMountParameters) => {
        const root = createRoot(element);

        root.render(
          <ScreenshotModeContext.Provider value={screenshotMode}>
            <App />
          </ScreenshotModeContext.Provider>,
        );

        return () => root.unmount();
      },
    });
  }

  start() {}

  stop() {}
}
