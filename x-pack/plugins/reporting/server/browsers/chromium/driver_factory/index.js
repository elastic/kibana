/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import puppeteer from 'puppeteer-core';
import rimraf from 'rimraf';
import { HeadlessChromiumDriver } from '../driver';
import { args } from './args';
import { safeChildProcess } from '../../safe_child_process';

export class HeadlessChromiumDriverFactory {
  constructor(binaryPath, logger, browserConfig) {
    this.binaryPath = binaryPath;
    this.logger = logger.clone(['chromium-driver-factory']);
    this.browserConfig = browserConfig;
  }

  type = 'chromium';

  async create({ viewport, browserTimezone }) {
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chromium-'));
    const chromiumArgs = args({
      userDataDir,
      viewport,
      verboseLogging: this.logger.isVerbose,
      disableSandbox: this.browserConfig.disableSandbox,
      proxyConfig: this.browserConfig.proxy,
    });

    let chromium;
    let page;

    try {
      chromium = await puppeteer.launch({
        userDataDir,
        executablePath: this.binaryPath,
        ignoreHTTPSErrors: true,
        args: chromiumArgs,
        env: {
          TZ: browserTimezone
        }
      });

      page = await chromium.newPage();
    } catch (err) {
      throw new Error(`Caught error spawning Chromium` + err);
      return;
    }

    page.on('console', line => {

      if (line._type !== 'error') {
        return;
      }

      if (!line._text.match(/\[\d+\/\d+.\d+:\w+:CONSOLE\(\d+\)\]/)) {
        this.logger.debug(line._text, ['browser']);
        return;
      }

      if (line._text.includes('error while loading shared libraries: libnss3.so')) {
        throw new Error(`You must install nss for Reporting to work`);
      }

      if (line._text.includes('Check failed: InitDefaultFont(). Could not find the default font')) {
        throw new Error('You must install freetype and ttf-font for Reporting to work');
      }

      if (line._text.includes('No usable sandbox! Update your kernel')) {
        let errText = 'Unable to use Chromium sandbox. ';
        errText += 'This can be disabled at your own risk with xpack.reporting.capture.browser.chromium.disableSandbox';
        throw new Error(errText);
      }

      if (line._text.includes('error while loading shared libraries: libnss3.so')) {
        throw new Error(`You must install nss for Reporting to work`);
      }

      this.logger.debug(line._text, ['browserConsole']);

    });

    safeChildProcess({
      async kill() {
        await chromium.close();
      }
    });

    const browser = new HeadlessChromiumDriver(page, {
      maxScreenshotDimension: this.browserConfig.maxScreenshotDimension,
      logger: this.logger
    });

    page.on('error', msg => {
      this.logger.error(msg);
      throw new Error(`Unable to spawn Chromium`);
    });

    chromium.on('disconnected', err => {
      this.logger.error(`Chromium exited with code: ${err}. ${JSON.stringify(err)}`);
      //throw new Error(`Chromium exited with code: ${err}. ${JSON.stringify(err)}`);
    });

    // unsubscribe logic makes a best-effort attempt to delete the user data directory used by chromium
    // the unsubscribe function isn't `async` so we're going to make our best effort at
    // deleting the userDataDir and if it fails log an error.
    rimraf(userDataDir, (err) => {
      this.logger.debug(`deleting chromium user data directory at ${userDataDir}`);
      if (err) {
        this.logger.error(`error deleting user data directory at ${userDataDir}: ${err}`);
      }
    });


    return { browser, chromium };
  }
}
