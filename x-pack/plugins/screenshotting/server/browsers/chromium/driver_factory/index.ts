/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/server';
import { getDataPath } from '@kbn/utils';
import { spawn } from 'child_process';
import del from 'del';
import fs from 'fs';
import { uniq } from 'lodash';
import os from 'os';
import path from 'path';
import puppeteer, { Browser, ConsoleMessage, HTTPRequest, Page, Viewport } from 'puppeteer';
import { createInterface } from 'readline';
import * as Rx from 'rxjs';
import {
  catchError,
  concatMap,
  filter,
  ignoreElements,
  map,
  mergeMap,
  takeUntil,
  tap,
  toArray,
} from 'rxjs/operators';
import { getChromiumDisconnectedError } from '..';
import { errors } from '../../../../common';
import { ConfigType } from '../../../config';
import { getDefaultChromiumSandboxDisabled } from '../../../config/default_chromium_sandbox_disabled';
import { safeChildProcess } from '../../safe_child_process';
import { HeadlessChromiumDriver } from '../driver';
import { args } from './args';
import { getMetrics, PerformanceMetrics } from './metrics';

type DefaultViewport = Pick<Viewport, 'width' | 'height' | 'deviceScaleFactor'>;

interface CreatePageOptions {
  browserTimezone?: string;
  defaultViewport: Partial<DefaultViewport>;
  openUrlTimeout: number;
}

interface CreatePageResult {
  driver: HeadlessChromiumDriver;
  error$: Rx.Observable<Error>;
  /**
   * Close the page and the browser.
   *
   * @note Ensure this function gets called once all actions against the page
   * have concluded. This ensures the browser is closed and gives the OS a chance
   * to reclaim resources like memory.
   */
  close: () => Rx.Observable<ClosePageResult>;

  /**
   * Observable for gathering logs
   */
  logs$: Rx.Observable<string>;
}

interface ClosePageResult {
  metrics?: PerformanceMetrics;
}

export type InternalLogger = (
  message: string | Error,
  level?: 'info' | 'debug' | 'warn' | 'error',
  context?: string
) => void;

/**
 * Size of the desired initial viewport. This is needed to render the app before elements load into their
 * layout. Once the elements are positioned, the viewport must be *resized* to include the entire element container.
 */
export const DEFAULT_VIEWPORT: Required<DefaultViewport> = {
  width: 1950,
  height: 1200,
  deviceScaleFactor: 1,
};

// Default args used by pptr
// https://github.com/puppeteer/puppeteer/blob/13ea347/src/node/Launcher.ts#L168
const DEFAULT_ARGS = [
  '--disable-background-networking',
  '--enable-features=NetworkService,NetworkServiceInProcess',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-breakpad',
  '--disable-client-side-phishing-detection',
  '--disable-component-extensions-with-background-pages',
  '--disable-default-apps',
  '--disable-dev-shm-usage',
  '--disable-extensions',
  '--disable-features=TranslateUI',
  '--disable-hang-monitor',
  '--disable-ipc-flooding-protection',
  '--disable-popup-blocking',
  '--disable-prompt-on-repost',
  '--disable-renderer-backgrounding',
  '--disable-sync',
  '--force-color-profile=srgb',
  '--metrics-recording-only',
  '--no-first-run',
  '--enable-automation',
  '--password-store=basic',
  '--use-mock-keychain',
  '--remote-debugging-port=0',
  '--headless',
];

const DIAGNOSTIC_TIME = 5 * 1000;

export class HeadlessChromiumDriverFactory {
  type = 'chromium';

  constructor(
    private screenshotMode: ScreenshotModePluginSetup,
    private config: ConfigType,
    private logger: Logger,
    private binaryPath: string,
    private basePath: string
  ) {}

  private getChromiumArgs() {
    const { height, width } = DEFAULT_VIEWPORT;
    return args({
      disableSandbox: this.config.browser.chromium.disableSandbox,
      proxy: this.config.browser.chromium.proxy,
      windowSize: { height, width },
    });
  }

  private createDiagnosticLogger(logger: Logger, logs$: Rx.ReplaySubject<string>) {
    const log: InternalLogger = (message, level = 'debug') => {
      if (level === 'error' && typeof message === 'object') {
        logger.error(message);
      } else if (typeof message === 'object') {
        logger[level](message.toString());
      } else {
        logger[level](message);
      }
      logs$.next(new Date(Date.now()).toISOString() + `: ${message}`);
    };
    return log;
  }

  private getUserDataDir() {
    const dataDir = getDataPath();
    fs.mkdirSync(dataDir, { recursive: true });
    const userDataDir = fs.mkdtempSync(path.join(dataDir, 'chromium-'));
    this.logger.debug(`Chromium userDataDir: ${userDataDir}`);
    return userDataDir;
  }

  /*
   * Return an observable to objects which will drive screenshot capture for a page
   */
  createPage(
    { browserTimezone, openUrlTimeout, defaultViewport }: CreatePageOptions,
    pLogger = this.logger
  ): Rx.Observable<CreatePageResult> {
    return new Rx.Observable((observer) => {
      const logs$ = new Rx.ReplaySubject<string>();
      const log = this.createDiagnosticLogger(pLogger.get('browser-driver'), logs$);
      log(`Creating browser page driver...`, 'info');

      const chromiumArgs = this.getChromiumArgs();
      log(`Chromium launch args set to: ${chromiumArgs}`);
      log(`Sandbox is disabled: ${this.config.browser.chromium.disableSandbox}`);

      // We set the viewport width using the client-side layout info to reduce the chances of
      // browser reflow. Only the window height is expected to be adjusted dramatically
      // before taking a screenshot, to ensure the elements to capture are contained in the viewport.
      const viewport = {
        deviceScaleFactor: DEFAULT_VIEWPORT.deviceScaleFactor,
        width: defaultViewport.width ?? DEFAULT_VIEWPORT.width,
        height: defaultViewport.height ?? DEFAULT_VIEWPORT.height,
      };

      log(
        `Launching with viewport:` +
          ` width=${viewport.width} height=${viewport.height} scaleFactor=${viewport.deviceScaleFactor}`,
        'info'
      );

      (async () => {
        const {
          os: { os: distOs, dist, release },
        } = await getDefaultChromiumSandboxDisabled();
        log(`Operating system: ${distOs}/${dist}/${release}. Architecture: ${os.arch()}`);

        let userDataDir: string;
        let browser: Browser | undefined;

        try {
          userDataDir = this.getUserDataDir();
          browser = await puppeteer.launch({
            pipe: !this.config.browser.chromium.inspect,
            userDataDir,
            executablePath: this.binaryPath,
            ignoreHTTPSErrors: true,
            handleSIGHUP: false,
            args: chromiumArgs,
            defaultViewport: viewport,
            env: {
              TZ: browserTimezone,
            },
          });
        } catch (err) {
          const error = new errors.FailedToSpawnBrowserError(
            `Error spawning Chromium browser! ${err}`
          );
          observer.error(error);
          log(error, 'error');
          return;
        }

        const page = await browser.newPage();
        const devTools = await page.target().createCDPSession();

        await devTools.send('Performance.enable', { timeDomain: 'timeTicks' });
        const startMetrics = await devTools.send('Performance.getMetrics');

        // Log version info for debugging / maintenance
        const versionInfo = await devTools.send('Browser.getVersion');
        log(`Browser version: ${JSON.stringify(versionInfo)}`);

        log(`Setting browser timezone to ${browserTimezone}...`);
        await page.emulateTimezone(browserTimezone);

        // Set the default timeout for all navigation methods to the openUrl timeout
        // All waitFor methods have their own timeout config passed in to them
        page.setDefaultTimeout(openUrlTimeout);
        log(`Browser page driver created`);

        const childProcess = {
          async kill(): Promise<ClosePageResult> {
            if (page.isClosed()) {
              return {};
            }

            let metrics: PerformanceMetrics | undefined;

            try {
              if (devTools && startMetrics) {
                const endMetrics = await devTools.send('Performance.getMetrics');
                metrics = getMetrics(startMetrics, endMetrics);
                const { cpuInPercentage, memoryInMegabytes } = metrics;

                log(`Chromium consumed CPU ${cpuInPercentage}% Memory ${memoryInMegabytes}MB`);
              }
            } catch (error) {
              log(error);
            }

            try {
              log('Closing the browser...');
              await browser?.close();
              log('Browser closed.');
            } catch (err) {
              // do not throw
              log(err);
            }

            return { metrics };
          },
        };
        const { terminate$ } = safeChildProcess(log, childProcess);

        // Ensure that the browser is closed once the observable completes.
        observer.add(() => {
          if (page.isClosed()) return; // avoid emitting a log unnecessarily
          childProcess.kill(); // ignore async
        });

        // make the observer subscribe to terminate$
        observer.add(
          terminate$
            .pipe(
              tap((signal) => {
                log(`Termination signal received: ${signal}`);
              }),
              ignoreElements()
            )
            .subscribe(observer)
        );

        // taps the browser log streams and combine them to Kibana logs
        this.getBrowserLogger(page, log).subscribe();
        this.getProcessLogger(browser, log).subscribe();

        // HeadlessChromiumDriver: object to "drive" a browser page
        const driver = new HeadlessChromiumDriver(
          this.screenshotMode,
          this.config,
          this.basePath,
          page
        );

        // unsubscribe logic makes a best-effort attempt to delete the user data directory used by chromium
        observer.add(() => {
          pLogger.debug(`Deleting Chromium userDataDir: ${userDataDir}`);
          log(`Deleting Chromium user data directory`);
          // the unsubscribe function isn't `async` so we're going to make our best effort at
          // deleting the userDataDir and if it fails log an error.
          del(userDataDir, { force: true }).catch((error) => {
            log(new Error(`error deleting Chromium user data directory: ${error}`));
          });

          logs$.complete();
        });

        const error$ = Rx.concat(driver.screenshottingError$, this.getPageExit(browser, page)).pipe(
          mergeMap((err) => Rx.throwError(() => err))
        );
        const close = () => Rx.from(childProcess.kill());
        observer.next({ driver, error$, close, logs$ });
      })();
    });
  }

  /**
   * In certain cases the browser will emit an error object to console. To ensure
   * we extract the message from the error object we need to go the browser's context
   * and look at the error there.
   *
   * If we don't do this we we will get a string that says "JSHandle@error" from
   * line.text().
   *
   * See https://github.com/puppeteer/puppeteer/issues/3397.
   */
  private async getErrorMessage(message: ConsoleMessage): Promise<undefined | string> {
    for (const arg of message.args()) {
      const errorMessage = await arg
        .executionContext()
        .evaluate<undefined | string>((_arg: unknown) => {
          /* !! We are now in the browser context !! */
          if (_arg instanceof Error) {
            return _arg.message;
          }
          return undefined;
          /* !! End of browser context !! */
        }, arg);
      if (errorMessage) {
        return errorMessage;
      }
    }
  }

  getBrowserLogger(page: Page, logger: InternalLogger): Rx.Observable<void> {
    const consoleMessages$ = Rx.fromEvent<ConsoleMessage>(page, 'console').pipe(
      concatMap(async (line) => {
        const lineUrl = line.location()?.url;
        let urlPath: string | undefined = '';
        try {
          // strip out the hostname and port from the log message
          urlPath = lineUrl != null ? new URL(lineUrl).pathname : lineUrl;
        } catch (e) {
          // URL could not be parsed
          urlPath = lineUrl;
        }
        const lineText = line.text().trim();
        if (line.type() === 'error') {
          const message = await this.getErrorMessage(line);
          logger(
            new Error(`[${urlPath}]:` + ` "${message ?? lineText}"`),
            undefined,
            'headless-browser-console'
          );
          return;
        }

        logger(
          `Console message [${urlPath}]: "${lineText}"`,
          undefined,
          `headless-browser-console:${line.type()}`
        );
      })
    );

    const uncaughtExceptionPageError$ = Rx.fromEvent<Error>(page, 'pageerror').pipe(
      map((err) => {
        logger(
          `Reporting encountered an uncaught error on the page that will be ignored: ${err.message}`,
          'warn'
        );
      })
    );

    const pageRequestFailed$ = Rx.fromEvent<HTTPRequest>(page, 'requestfailed').pipe(
      map((req) => {
        const failure = req.failure && req.failure();
        if (failure) {
          logger(
            `Request to [${req.url()}] failed! [${failure.errorText}]. This error will be ignored.`,
            'warn'
          );
        }
      })
    );

    return Rx.merge(consoleMessages$, uncaughtExceptionPageError$, pageRequestFailed$);
  }

  getProcessLogger(browser: Browser, logger: InternalLogger): Rx.Observable<void> {
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
        logger('Child browser process closed', 'debug', 'headless-browser-process');
      })
    );

    return processClose$; // ideally, this would also merge with observers for stdout and stderr
  }

  getPageExit(browser: Browser, page: Page): Rx.Observable<Error> {
    const pageError$ = Rx.fromEvent<Error>(page, 'error').pipe(
      map((err) => new Error(`Reporting encountered an error: ${err.toString()}`))
    );

    const browserDisconnect$ = Rx.fromEvent(browser, 'disconnected').pipe(
      map(() => getChromiumDisconnectedError())
    );

    return Rx.merge(pageError$, browserDisconnect$);
  }

  diagnose(overrideFlags: string[] = []): Rx.Observable<string[]> {
    const kbnArgs = this.getChromiumArgs();
    const userDataDir = this.getUserDataDir();
    const finalArgs = uniq([
      ...DEFAULT_ARGS,
      ...kbnArgs,
      ...overrideFlags,
      `--user-data-dir=${userDataDir}`,
    ]);

    // On non-windows platforms, `detached: true` makes child process a
    // leader of a new process group, making it possible to kill child
    // process tree with `.kill(-pid)` command. @see
    // https://nodejs.org/api/child_process.html#child_process_options_detached
    const browserProcess = spawn(this.binaryPath, finalArgs, {
      detached: process.platform !== 'win32',
    });

    const rl = createInterface({ input: browserProcess.stderr });

    const exit$ = Rx.fromEvent(browserProcess, 'exit').pipe(
      map((code) => {
        this.logger.error(`Browser exited abnormally, received code: ${code}`);
        return `Browser exited abnormally during startup`;
      })
    );

    const browserProcessLogger = this.logger.get('chromium-stderr');
    const error$ = Rx.fromEvent(browserProcess, 'error').pipe(
      map((err) => {
        browserProcessLogger.error(`Browser process threw an error on startup`);
        browserProcessLogger.error(err as string | Error);
        return `Browser process threw an error on startup`;
      })
    );

    const log$ = Rx.fromEvent(rl, 'line').pipe(
      tap((message: unknown) => {
        if (typeof message === 'string') {
          browserProcessLogger.info(message);
        }
      }),
      filter((message) => message !== ''),
      map((message) => (message as object).toString())
    );

    // Collect all events (exit, error and on log-lines), but let chromium keep spitting out
    // logs as sometimes it's "bind" successfully for remote connections, but later emit
    // a log indicative of an issue (for example, no default font found).
    return Rx.merge(exit$, error$, log$).pipe(
      takeUntil(Rx.timer(DIAGNOSTIC_TIME)),
      toArray(),
      tap(() => {
        if (browserProcess && browserProcess.pid && !browserProcess.killed) {
          browserProcess.kill('SIGKILL');
          this.logger.info(
            `Successfully sent 'SIGKILL' to browser process (PID: ${browserProcess.pid})`
          );
        }
        browserProcess.removeAllListeners();
        rl.removeAllListeners();
        rl.close();
        del(userDataDir, { force: true }).catch((error) => {
          this.logger.error(`Error deleting user data directory at [${userDataDir}]!`);
          this.logger.error(error);
        });
      }),
      catchError((error) => {
        this.logger.error(error);

        return Rx.of(error);
      })
    );
  }
}

export type { PerformanceMetrics };
