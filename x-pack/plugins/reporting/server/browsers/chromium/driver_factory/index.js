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
//import * as Rx from 'rxjs';
//import { map, share, mergeMap, filter, partition } from 'rxjs/operators';
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
        },
      });


      page = await chromium.newPage();
    } catch (err) {
      throw new Error(`Caught error spawning Chromium` + err);
      return;
    }

    page.on('console', line => {
      if (line._type === 'error') {
        if (line._text.match(/\[\d+\/\d+.\d+:\w+:CONSOLE\(\d+\)\]/)) {
          if (line._text.includes('error while loading shared libraries: libnss3.so')) {
            throw new Error(`You must install nss for Reporting to work`);}
          if (line._text.includes('Check failed: InitDefaultFont(). Could not find the default font')) {
            throw new Error('You must install freetype and ttf-font for Reporting to work');}
          if (line._text.includes('No usable sandbox! Update your kernel')) {
            let errText = 'Unable to use Chromium sandbox. ';
            errText += 'This can be disabled at your own risk with xpack.reporting.capture.browser.chromium.disableSandbox';
            throw new Error(errText);}
          if (line._text.includes('error while loading shared libraries: libnss3.so')) {
            throw new Error(`You must install nss for Reporting to work`);}
          this.logger.debug(line._text, ['browserConsole']);
        }
        else {
          this.logger.debug(line._text, ['browser']);}
      }});

    process.on('SIGTERM', () => {
      this.logger.debug('SIGTERM received from process. Process is terminating.');
    });
    process.on('SIGINT', () => {
      this.logger.debug('SIGINT received from process. Process is terminating.');
    });
    process.on('SIGBREAK', () => {
      this.logger.debug('SIGBREAK received from process. Process is terminating.');
    });

    safeChildProcess({
      async kill() {
        await chromium.close();
      }
    });
    /*
      const stderr$ = Rx.fromEvent(page, 'console').pipe(
        filter(line => line._type === 'error'),
        map(line => line._text),
        share()
      );
      */
    /*
    const [consoleMessage$, message$] = stderr$.pipe(
      partition(msg => msg.match(/\[\d+\/\d+.\d+:\w+:CONSOLE\(\d+\)\]/))
    );*/

    const browser = new HeadlessChromiumDriver(page, {
      maxScreenshotDimension: this.browserConfig.maxScreenshotDimension,
      logger: this.logger
    });

    page.on('error', msg => {
      this.logger.error(msg);
      throw new Error(`Unable to spawn Chromium`);
    });

    chromium.on('disconnected', err => {
      throw new Error(`Chromium exited with code: ${err}. ${JSON.stringify(err)}`);
    });
    /*
      const processError$ = Rx.fromEvent(page, 'error').pipe(
        map((err) => this.logger.error(err)),
        mergeMap(() => Rx.throwError(new Error(`Unable to spawn Chromium`))),
      );

      const processExit$ = Rx.fromEvent(chromium, 'disconnected').pipe(
        mergeMap((err) => Rx.throwError(new Error(`Chromium exited with code: ${err}. ${JSON.stringify(err)}`)))
      );

      const nssError$ = message$.pipe(
        filter(line => line.includes('error while loading shared libraries: libnss3.so')),
        mergeMap(() => Rx.throwError(new Error(`You must install nss for Reporting to work`)))
      );

      const fontError$ = message$.pipe(
        filter(line => line.includes('Check failed: InitDefaultFont(). Could not find the default font')),
        mergeMap(() => Rx.throwError(new Error('You must install freetype and ttf-font for Reporting to work')))
      );

      const noUsableSandbox$ = message$.pipe(
        filter(line => line.includes('No usable sandbox! Update your kernel')),
        mergeMap(() => Rx.throwError(new Error(compactWhitespace(`
          Unable to use Chromium sandbox. This can be disabled at your own risk with
          'xpack.reporting.capture.browser.chromium.disableSandbox'
        `))))
      );

      const exit$ = Rx.merge(processError$, processExit$, nssError$, fontError$, noUsableSandbox$);

      observer.next({
        driver$,
        consoleMessage$,
        message$,
        exit$
      });
*/
    // unsubscribe logic makes a best-effort attempt to delete the user data directory used by chromium
    this.logger.debug(`deleting chromium user data directory at ${userDataDir}`);
    // the unsubscribe function isn't `async` so we're going to make our best effort at
    // deleting the userDataDir and if it fails log an error.
    rimraf(userDataDir, (err) => {
      if (err) {
        this.logger.error(`error deleting user data directory at ${userDataDir}: ${err}`);
      }
    });


    return browser;
  }
}
