/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import type {
  CoreSetup,
  CoreStart,
  Logger,
  PackageInfo,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import { ChromiumArchivePaths, HeadlessChromiumDriverFactory, install } from './browsers';
import { ConfigType, createConfig } from './config';
import { Screenshots } from './screenshots';
import { getChromiumPackage } from './utils';

interface SetupDeps {
  screenshotMode: ScreenshotModePluginSetup;
  cloud?: CloudSetup;
}

/**
 * Start public contract.
 */
export interface ScreenshottingStart {
  /**
   * Runs browser diagnostics.
   * @returns Observable with output messages.
   */
  diagnose: HeadlessChromiumDriverFactory['diagnose'];

  /**
   * Takes screenshots of multiple pages.
   * @param options Screenshots session options.
   * @returns Observable with screenshotting results.
   */
  getScreenshots: Screenshots['getScreenshots'];
}

export class ScreenshottingPlugin implements Plugin<void, ScreenshottingStart, SetupDeps> {
  private config: ConfigType;
  private logger: Logger;
  private packageInfo: PackageInfo;
  private screenshotMode!: ScreenshotModePluginSetup;
  private browserDriverFactory!: Promise<HeadlessChromiumDriverFactory>;
  private screenshots!: Promise<Screenshots>;

  constructor(context: PluginInitializerContext<ConfigType>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
    this.packageInfo = context.env.packageInfo;
  }

  setup({ http }: CoreSetup, { screenshotMode, cloud }: SetupDeps) {
    this.screenshotMode = screenshotMode;
    this.browserDriverFactory = (async () => {
      const paths = new ChromiumArchivePaths();
      const logger = this.logger.get('chromium');
      const [config, binaryPath] = await Promise.all([
        createConfig(this.logger, this.config),
        install(paths, logger, getChromiumPackage()),
      ]);
      const basePath = http.basePath.serverBasePath;

      return new HeadlessChromiumDriverFactory(
        this.screenshotMode,
        config,
        logger,
        binaryPath,
        basePath
      );
    })();
    this.browserDriverFactory.catch((error) => {
      this.logger.error('Error in screenshotting setup, it may not function properly.');
      this.logger.error(error);
    });

    this.screenshots = (async () => {
      const browserDriverFactory = await this.browserDriverFactory;
      return new Screenshots(
        browserDriverFactory,
        this.logger,
        this.packageInfo,
        http,
        this.config,
        cloud
      );
    })();
    // Already handled in `browserDriverFactory`
    this.screenshots.catch(() => {});

    return {};
  }

  start({}: CoreStart): ScreenshottingStart {
    return {
      diagnose: () =>
        from(this.browserDriverFactory).pipe(switchMap((factory) => factory.diagnose())),
      getScreenshots: ((options) =>
        from(this.screenshots).pipe(
          switchMap((screenshots) => screenshots.getScreenshots(options))
        )) as ScreenshottingStart['getScreenshots'],
    };
  }

  stop() {}
}
