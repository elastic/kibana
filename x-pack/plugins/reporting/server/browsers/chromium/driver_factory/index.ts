/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import del from 'del';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  Browser,
  ConsoleMessage,
  LaunchOptions,
  Page,
  Request as PuppeteerRequest,
} from 'puppeteer';
import * as Rx from 'rxjs';
import { InnerSubscriber } from 'rxjs/internal/InnerSubscriber';
import { ignoreElements, map, mergeMap, tap } from 'rxjs/operators';
import { BROWSER_TYPE } from '../../../../common/constants';
import { CaptureConfig } from '../../../../server/types';
import { LevelLogger } from '../../../lib';
import { safeChildProcess } from '../../safe_child_process';
import { HeadlessChromiumDriver } from '../driver';
import { getChromeLogLocation } from '../paths';
import { puppeteerLaunch } from '../puppeteer';
import { args } from './args';

type BrowserConfig = CaptureConfig['browser']['chromium'];
type ViewportConfig = CaptureConfig['viewport'];

export class HeadlessChromiumDriverFactory {
  private binaryPath: string;
  private captureConfig: CaptureConfig;
  private browserConfig: BrowserConfig;
  private userDataDir: string;
  private getChromiumArgs: (viewport: ViewportConfig) => string[];

  constructor(binaryPath: string, captureConfig: CaptureConfig, logger: LevelLogger) {
    this.binaryPath = binaryPath;
    this.captureConfig = captureConfig;
    this.browserConfig = captureConfig.browser.chromium;

    if (this.browserConfig.disableSandbox) {
      logger.warning(`Enabling the Chromium sandbox provides an additional layer of protection.`);
    }

    this.userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chromium-'));
    this.getChromiumArgs = (viewport: ViewportConfig) =>
      args({
        userDataDir: this.userDataDir,
        viewport,
        disableSandbox: this.browserConfig.disableSandbox,
        proxy: this.browserConfig.proxy,
      });
  }

  type = BROWSER_TYPE;

  test(logger: LevelLogger) {
    const chromiumArgs = args({
      userDataDir: this.userDataDir,
      viewport: { width: 800, height: 600 },
      disableSandbox: this.browserConfig.disableSandbox,
      proxy: this.browserConfig.proxy,
    });

    return puppeteerLaunch({
      userDataDir: this.userDataDir,
      executablePath: this.binaryPath,
      ignoreHTTPSErrors: true,
      args: chromiumArgs,
    } as LaunchOptions).catch((error: Error) => {
      logger.error(
        `The Reporting plugin encountered issues launching Chromium in a self-test. You may have trouble generating reports.`
      );
      logger.error(error);
      logger.warning(`See Chromium's log output at "${getChromeLogLocation(this.binaryPath)}"`);
      return null;
    });
  }

  /*
   * Return an observable to objects which will drive screenshot capture for a page
   */
  createPage(
    { viewport, browserTimezone }: { viewport: ViewportConfig; browserTimezone: string },
    pLogger: LevelLogger
  ): Rx.Observable<{ driver: HeadlessChromiumDriver; exit$: Rx.Observable<never> }> {
    return Rx.Observable.create(async (observer: InnerSubscriber<any, any>) => {
      const logger = pLogger.clone(['browser-driver']);
      logger.info(`Creating browser page driver`);

      const chromiumArgs = this.getChromiumArgs(viewport);

      let browser: Browser;
      let page: Page;
      try {
        browser = await puppeteerLaunch({
          pipe: !this.browserConfig.inspect,
          userDataDir: this.userDataDir,
          executablePath: this.binaryPath,
          ignoreHTTPSErrors: true,
          args: chromiumArgs,
          env: {
            TZ: browserTimezone,
          },
        } as LaunchOptions);

        page = await browser.newPage();

        // Set the default timeout for all navigation methods to the openUrl timeout (30 seconds)
        // All waitFor methods have their own timeout config passed in to them
        page.setDefaultTimeout(this.captureConfig.timeouts.openUrl);

        logger.debug(`Browser page driver created`);
      } catch (err) {
        observer.error(new Error(`Error spawning Chromium browser: [${err}]`));
        throw err;
      }

      const childProcess = {
        async kill() {
          await browser.close();
        },
      };
      const { terminate$ } = safeChildProcess(logger, childProcess);

      // this is adding unsubscribe logic to our observer
      // so that if our observer unsubscribes, we terminate our child-process
      observer.add(() => {
        logger.debug(`The browser process observer has unsubscribed. Closing the browser...`);
        childProcess.kill(); // ignore async
      });

      // make the observer subscribe to terminate$
      observer.add(
        terminate$
          .pipe(
            tap((signal) => {
              logger.debug(`Termination signal received: ${signal}`);
            }),
            ignoreElements()
          )
          .subscribe(observer)
      );

      // taps the browser log streams and combine them to Kibana logs
      this.getBrowserLogger(page, logger).subscribe();
      this.getProcessLogger(browser, logger).subscribe();

      // HeadlessChromiumDriver: object to "drive" a browser page
      const driver = new HeadlessChromiumDriver(page, {
        inspect: !!this.browserConfig.inspect,
        networkPolicy: this.captureConfig.networkPolicy,
      });

      // Rx.Observable<never>: stream to interrupt page capture
      const exit$ = this.getPageExit(browser, page);

      observer.next({ driver, exit$ });

      // unsubscribe logic makes a best-effort attempt to delete the user data directory used by chromium
      observer.add(() => {
        const userDataDir = this.userDataDir;
        logger.debug(`deleting chromium user data directory at [${userDataDir}]`);
        // the unsubscribe function isn't `async` so we're going to make our best effort at
        // deleting the userDataDir and if it fails log an error.
        del(userDataDir, { force: true }).catch((error) => {
          logger.error(`error deleting user data directory at [${userDataDir}]: [${error}]`);
        });
      });
    });
  }

  getBrowserLogger(page: Page, logger: LevelLogger): Rx.Observable<void> {
    const consoleMessages$ = Rx.fromEvent<ConsoleMessage>(page, 'console').pipe(
      map((line) => {
        if (line.type() === 'error') {
          logger.error(line.text(), ['headless-browser-console']);
        } else {
          logger.debug(line.text(), [`headless-browser-console:${line.type()}`]);
        }
      })
    );

    const pageRequestFailed$ = Rx.fromEvent<PuppeteerRequest>(page, 'requestfailed').pipe(
      map((req) => {
        const failure = req.failure && req.failure();
        if (failure) {
          logger.warning(
            `Request to [${req.url()}] failed! [${failure.errorText}]. This error will be ignored.`
          );
        }
      })
    );

    return Rx.merge(consoleMessages$, pageRequestFailed$);
  }

  getProcessLogger(browser: Browser, logger: LevelLogger): Rx.Observable<void> {
    const childProcess = browser.process();
    // NOTE: The browser driver can not observe stdout and stderr of the child process
    // Puppeteer doesn't give a handle to the original ChildProcess object
    // See https://github.com/GoogleChrome/puppeteer/issues/1292#issuecomment-521470627

    // just log closing of the process
    const processClose$ = Rx.fromEvent<void>(childProcess, 'close').pipe(
      tap(() => {
        logger.debug('child process closed', ['headless-browser-process']);
      })
    );

    return processClose$; // ideally, this would also merge with observers for stdout and stderr
  }

  getPageExit(browser: Browser, page: Page) {
    const pageError$ = Rx.fromEvent<Error>(page, 'error').pipe(
      mergeMap((err) => {
        return Rx.throwError(
          i18n.translate('xpack.reporting.browsers.chromium.errorDetected', {
            defaultMessage: 'Reporting detected an error: {err}',
            values: { err: err.toString() },
          })
        );
      })
    );

    const uncaughtExceptionPageError$ = Rx.fromEvent<Error>(page, 'pageerror').pipe(
      mergeMap((err) => {
        return Rx.throwError(
          i18n.translate('xpack.reporting.browsers.chromium.pageErrorDetected', {
            defaultMessage: `Reporting detected an error on the page: {err}`,
            values: { err: err.toString() },
          })
        );
      })
    );

    const browserDisconnect$ = Rx.fromEvent(browser, 'disconnected').pipe(
      mergeMap(() =>
        Rx.throwError(
          new Error(
            i18n.translate('xpack.reporting.browsers.chromium.chromiumClosed', {
              defaultMessage: `Reporting detected that Chromium has closed.`,
            })
          )
        )
      )
    );

    return Rx.merge(pageError$, uncaughtExceptionPageError$, browserDisconnect$);
  }
}
