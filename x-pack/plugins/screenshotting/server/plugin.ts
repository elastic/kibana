/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from 'src/core/server';
import type { ScreenshotModePluginSetup } from 'src/plugins/screenshot_mode/server';
import { HeadlessChromiumDriverFactory, installBrowser } from './browsers';
import { createConfig, ConfigType } from './config';

interface SetupDeps {
  screenshotMode: ScreenshotModePluginSetup;
}

export class ScreenshottingPlugin implements Plugin<void, void, SetupDeps> {
  private config: ConfigType;
  private logger: Logger;
  private screenshotMode!: ScreenshotModePluginSetup;
  private browserDriverFactory!: Promise<HeadlessChromiumDriverFactory>;

  constructor(context: PluginInitializerContext<ConfigType>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
  }

  setup({}: CoreSetup, { screenshotMode }: SetupDeps) {
    this.screenshotMode = screenshotMode;

    return {};
  }

  start({}: CoreStart) {
    this.browserDriverFactory = (async () => {
      try {
        const logger = this.logger.get('chromium');
        const [config, binaryPath] = await Promise.all([
          createConfig(this.logger, this.config),
          installBrowser(logger),
        ]);

        return new HeadlessChromiumDriverFactory(this.screenshotMode, logger, {
          ...config,
          binaryPath,
        });
      } catch (error) {
        this.logger.error('Error in screenshotting setup, it may not function properly.');

        throw error;
      }
    })();

    return {};
  }

  stop() {}
}
