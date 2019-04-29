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
import * as Rx from 'rxjs';
import { map, share, mergeMap, filter, partition } from 'rxjs/operators';
import { HeadlessChromiumDriver } from '../driver';
import { args } from './args';
import { safeChildProcess } from '../../safe_child_process';
import { getChromeLogLocation } from '../paths';

const compactWhitespace = str => {
  return str.replace(/\s+/, ' ');
};

export class HeadlessChromiumDriverFactory {
  constructor(binaryPath, logger, browserConfig, queueTimeout) {
    this.binaryPath = binaryPath;
    this.logger = logger.clone(['chromium-driver-factory']);
    this.browserConfig = browserConfig;
    this.queueTimeout = queueTimeout;
  }

  type = 'chromium';

  test({ viewport, browserTimezone }, logger) {
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chromium-'));
    const chromiumArgs = args({
      userDataDir,
      viewport,
      verboseLogging: true,
      disableSandbox: this.browserConfig.disableSandbox,
      proxyConfig: this.browserConfig.proxy,
    });

    return puppeteer
      .launch({
        userDataDir,
        executablePath: this.binaryPath,
        ignoreHTTPSErrors: true,
        args: chromiumArgs,
        env: {
          TZ: browserTimezone,
        },
      })
      .catch(error => {
        logger.warning(
          `The Reporting plugin encountered issues launching Chromium in a self-test. You may have trouble generating reports: [${error}]`
        );
        logger.warning(`See Chromium's log output at "${getChromeLogLocation(this.binaryPath)}"`);
        return null;
      });
  }

  create({ viewport, browserTimezone }) {
    return Rx.Observable.create(async observer => {
      const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chromium-'));
      const chromiumArgs = args({
        userDataDir,
        viewport,
        verboseLogging: this.logger.isVerbose,
        disableSandbox: this.browserConfig.disableSandbox,
        proxyConfig: this.browserConfig.proxy,
      });

      let browser;
      let page;
      try {
        browser = await puppeteer.launch({
          userDataDir,
          executablePath: this.binaryPath,
          ignoreHTTPSErrors: true,
          args: chromiumArgs,
          env: {
            TZ: browserTimezone,
          },
        });

        page = await browser.newPage();

        // All navigation/waitFor methods default to 30 seconds,
        // which can cause the job to fail even if we bump timeouts in
        // the config. Help alleviate errors like
        // "TimeoutError: waiting for selector ".application" failed: timeout 30000ms exceeded"
        page.setDefaultTimeout(this.queueTimeout);
      } catch (err) {
        observer.error(new Error(`Error spawning Chromium browser: [${err}]`));
        throw err;
      }

      safeChildProcess(
        {
          async kill() {
            await browser.close();
          },
        },
        observer
      );

      // Register with a few useful puppeteer event handlers:
      // https://pptr.dev/#?product=Puppeteer&version=v1.10.0&show=api-event-error
      // https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-page

      const stderr$ = Rx.fromEvent(page, 'console').pipe(
        filter(line => line._type === 'error'),
        map(line => line._text),
        share()
      );

      const [consoleMessage$, message$] = stderr$.pipe(
        partition(msg => msg.match(/\[\d+\/\d+.\d+:\w+:CONSOLE\(\d+\)\]/))
      );

      const driver$ = Rx.of(
        new HeadlessChromiumDriver(page, {
          maxScreenshotDimension: this.browserConfig.maxScreenshotDimension,
          logger: this.logger,
          inspect: this.browserConfig.inspect,
        })
      );

      const processError$ = Rx.fromEvent(page, 'error').pipe(
        mergeMap(err => Rx.throwError(new Error(`Unable to spawn Chromium: [${err}]`)))
      );

      const processPageError$ = Rx.fromEvent(page, 'pageerror').pipe(
        mergeMap(err => Rx.throwError(new Error(`Uncaught exception within the page: [${err}]`)))
      );

      const processRequestFailed$ = Rx.fromEvent(page, 'requestfailed').pipe(
        mergeMap(req => {
          const failure = req.failure && req.failure();
          if (failure) {
            return Rx.throwError(
              new Error(`Request to [${req.url()}] failed! [${failure.errorText}]`)
            );
          }
          return Rx.throwError(new Error(`Unknown failure! [${JSON.stringify(req)}]`));
        })
      );

      const processExit$ = Rx.fromEvent(browser, 'disconnected').pipe(
        mergeMap(code =>
          Rx.throwError(new Error(`Chromium exited with: [${JSON.stringify({ code })}]`))
        )
      );

      const nssError$ = message$.pipe(
        filter(line => line.includes('error while loading shared libraries: libnss3.so')),
        mergeMap(() => Rx.throwError(new Error(`You must install nss for Reporting to work`)))
      );

      const fontError$ = message$.pipe(
        filter(line =>
          line.includes('Check failed: InitDefaultFont(). Could not find the default font')
        ),
        mergeMap(() =>
          Rx.throwError(new Error('You must install freetype and ttf-font for Reporting to work'))
        )
      );

      const noUsableSandbox$ = message$.pipe(
        filter(line => line.includes('No usable sandbox! Update your kernel')),
        mergeMap(() =>
          Rx.throwError(
            new Error(
              compactWhitespace(`
          Unable to use Chromium sandbox. This can be disabled at your own risk with
          'xpack.reporting.capture.browser.chromium.disableSandbox'
        `)
            )
          )
        )
      );

      const exit$ = Rx.merge(
        processError$,
        processPageError$,
        processRequestFailed$,
        processExit$,
        nssError$,
        fontError$,
        noUsableSandbox$
      );

      observer.next({
        driver$,
        consoleMessage$,
        message$,
        exit$,
      });

      // unsubscribe logic makes a best-effort attempt to delete the user data directory used by chromium
      return () => {
        this.logger.debug(`deleting chromium user data directory at [${userDataDir}]`);
        // the unsubscribe function isn't `async` so we're going to make our best effort at
        // deleting the userDataDir and if it fails log an error.
        rimraf(userDataDir, err => {
          if (err) {
            return this.logger.error(
              `error deleting user data directory at [${userDataDir}]: [${err}]`
            );
          }
        });
      };
    });
  }
}
