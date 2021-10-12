/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import { i18n } from '@kbn/i18n';
import { getDataPath } from '@kbn/utils';
import del from 'del';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import * as Rx from 'rxjs';
import { InnerSubscriber } from 'rxjs/internal/InnerSubscriber';
import { ignoreElements, map, mergeMap, tap } from 'rxjs/operators';
import { getChromiumDisconnectedError } from '../';
import { ReportingCore } from '../../..';
import { durationToNumber } from '../../../../common/schema_utils';
import { CaptureConfig } from '../../../../server/types';
import { LevelLogger } from '../../../lib';
import { safeChildProcess } from '../../safe_child_process';
import { HeadlessChromiumDriver } from '../driver';
import { args } from './args';
import { Metrics, getMetrics } from './metrics';

// Puppeteer type definitions do not match the documentation.
// See https://pptr.dev/#?product=Puppeteer&version=v8.0.0&show=api-puppeteerlaunchoptions
interface ReportingLaunchOptions extends puppeteer.LaunchOptions {
  userDataDir?: string;
  ignoreHTTPSErrors?: boolean;
  args?: string[];
}

declare module 'puppeteer' {
  function launch(options: ReportingLaunchOptions): Promise<puppeteer.Browser>;
}

type BrowserConfig = CaptureConfig['browser']['chromium'];
type ViewportConfig = CaptureConfig['viewport'];

export class HeadlessChromiumDriverFactory {
  private binaryPath: string;
  private captureConfig: CaptureConfig;
  private browserConfig: BrowserConfig;
  private userDataDir: string;
  private getChromiumArgs: (viewport: ViewportConfig) => string[];
  private core: ReportingCore;

  constructor(core: ReportingCore, binaryPath: string, logger: LevelLogger) {
    this.core = core;
    this.binaryPath = binaryPath;
    const config = core.getConfig();
    this.captureConfig = config.get('capture');
    this.browserConfig = this.captureConfig.browser.chromium;

    if (this.browserConfig.disableSandbox) {
      logger.warning(`Enabling the Chromium sandbox provides an additional layer of protection.`);
    }

    this.userDataDir = fs.mkdtempSync(path.join(getDataPath(), 'chromium-'));
    this.getChromiumArgs = (viewport: ViewportConfig) =>
      args({
        userDataDir: this.userDataDir,
        viewport,
        disableSandbox: this.browserConfig.disableSandbox,
        proxy: this.browserConfig.proxy,
      });
  }

  type = 'chromium';

  /*
   * Return an observable to objects which will drive screenshot capture for a page
   */
  createPage(
    { viewport, browserTimezone }: { viewport: ViewportConfig; browserTimezone?: string },
    pLogger: LevelLogger
  ): Rx.Observable<{ driver: HeadlessChromiumDriver; exit$: Rx.Observable<never> }> {
    // FIXME: 'create' is deprecated
    return Rx.Observable.create(async (observer: InnerSubscriber<unknown, unknown>) => {
      const logger = pLogger.clone(['browser-driver']);
      logger.info(`Creating browser page driver`);

      const chromiumArgs = this.getChromiumArgs(viewport);
      logger.debug(`Chromium launch args set to: ${chromiumArgs}`);

      let browser: puppeteer.Browser;
      let page: puppeteer.Page;
      let devTools: puppeteer.CDPSession | undefined;
      let startMetrics: Metrics | undefined;

      try {
        browser = await puppeteer.launch({
          pipe: !this.browserConfig.inspect,
          userDataDir: this.userDataDir,
          executablePath: this.binaryPath,
          ignoreHTTPSErrors: true,
          handleSIGHUP: false,
          args: chromiumArgs,
          env: {
            TZ: browserTimezone,
          },
        });

        page = await browser.newPage();
        devTools = await page.target().createCDPSession();

        await devTools.send('Performance.enable', { timeDomain: 'timeTicks' });
        startMetrics = await devTools.send('Performance.getMetrics');

        // Log version info for debugging / maintenance
        const versionInfo = await devTools.send('Browser.getVersion');
        logger.debug(`Browser version: ${JSON.stringify(versionInfo)}`);

        await page.emulateTimezone(browserTimezone);

        // Set the default timeout for all navigation methods to the openUrl timeout (30 seconds)
        // All waitFor methods have their own timeout config passed in to them
        page.setDefaultTimeout(durationToNumber(this.captureConfig.timeouts.openUrl));

        logger.debug(`Browser page driver created`);
      } catch (err) {
        observer.error(new Error(`Error spawning Chromium browser!`));
        observer.error(err);
        throw err;
      }

      const childProcess = {
        async kill() {
          try {
            if (devTools && startMetrics) {
              const endMetrics = await devTools.send('Performance.getMetrics');
              const { cpu, cpuInPercentage, memory, memoryInMegabytes } = getMetrics(
                startMetrics,
                endMetrics
              );

              apm.currentTransaction?.setLabel('cpu', cpu, false);
              apm.currentTransaction?.setLabel('memory', memory, false);
              logger.debug(
                `Chromium consumed CPU ${cpuInPercentage}% Memory ${memoryInMegabytes}MB`
              );
            }
          } catch (error) {
            logger.error(error);
          }

          try {
            await browser.close();
          } catch (err) {
            // do not throw
            logger.error(err);
          }
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
      const driver = new HeadlessChromiumDriver(this.core, page, {
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
          logger.error(`error deleting user data directory at [${userDataDir}]!`);
          logger.error(error);
        });
      });
    });
  }

  getBrowserLogger(page: puppeteer.Page, logger: LevelLogger): Rx.Observable<void> {
    const consoleMessages$ = Rx.fromEvent<puppeteer.ConsoleMessage>(page, 'console').pipe(
      map((line) => {
        const formatLine = () => `{ text: "${line.text()?.trim()}", url: ${line.location()?.url} }`;

        if (line.type() === 'error') {
          logger.error(`Error in browser console: ${formatLine()}`, ['headless-browser-console']);
        } else {
          logger.debug(`Message in browser console: ${formatLine()}`, [
            `headless-browser-console:${line.type()}`,
          ]);
        }
      })
    );

    const pageRequestFailed$ = Rx.fromEvent<puppeteer.HTTPRequest>(page, 'requestfailed').pipe(
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

  getProcessLogger(browser: puppeteer.Browser, logger: LevelLogger): Rx.Observable<void> {
    const childProcess = browser.process();
    // NOTE: The browser driver can not observe stdout and stderr of the child process
    // Puppeteer doesn't give a handle to the original ChildProcess object
    // See https://github.com/GoogleChrome/puppeteer/issues/1292#issuecomment-521470627

    if (childProcess == null) {
      throw new TypeError('childProcess is null or undefined!');
    }

    // just log closing of the process
    const processClose$ = Rx.fromEvent<void>(childProcess, 'close').pipe(
      tap(() => {
        logger.debug('child process closed', ['headless-browser-process']);
      })
    );

    return processClose$; // ideally, this would also merge with observers for stdout and stderr
  }

  getPageExit(browser: puppeteer.Browser, page: puppeteer.Page) {
    const pageError$ = Rx.fromEvent<Error>(page, 'error').pipe(
      mergeMap((err) => {
        return Rx.throwError(
          i18n.translate('xpack.reporting.browsers.chromium.errorDetected', {
            defaultMessage: 'Reporting encountered an error: {err}',
            values: { err: err.toString() },
          })
        );
      })
    );

    const uncaughtExceptionPageError$ = Rx.fromEvent<Error>(page, 'pageerror').pipe(
      mergeMap((err) => {
        return Rx.throwError(
          i18n.translate('xpack.reporting.browsers.chromium.pageErrorDetected', {
            defaultMessage: `Reporting encountered an error on the page: {err}`,
            values: { err: err.toString() },
          })
        );
      })
    );

    const browserDisconnect$ = Rx.fromEvent(browser, 'disconnected').pipe(
      mergeMap(() => Rx.throwError(getChromiumDisconnectedError()))
    );

    return Rx.merge(pageError$, uncaughtExceptionPageError$, browserDisconnect$);
  }
}
