/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import rimraf from 'rimraf';
import * as Rx from 'rxjs';
import { map, share, first, tap, mergeMap, filter, partition } from 'rxjs/operators';
import cdp from 'chrome-remote-interface';
import { HeadlessChromiumDriver } from '../driver';
import { args } from './args';
import { safeChildProcess, exitCodeSuggestion } from '../../safe_child_process';
import { ensureChromiumIsListening } from './ensure_chromium_is_listening';

const compactWhitespace = (str) => {
  return str.replace(/\s+/, ' ');
};

export class HeadlessChromiumDriverFactory {
  constructor(binaryPath, logger, browserConfig) {
    this.binaryPath = binaryPath;
    this.logger = logger.clone(['chromium-driver-factory']);
    this.browserConfig = browserConfig;
  }

  type = 'chromium';

  create({ bridgePort, viewport }) {
    return Rx.Observable.create(async observer => {
      const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chromium-'));
      const chromiumArgs = args({
        userDataDir,
        bridgePort,
        viewport,
        verboseLogging: this.logger.isVerbose,
        disableSandbox: this.browserConfig.disableSandbox,
        proxyConfig: this.browserConfig.proxy,
      });

      this.logger.debug(`spawning chromium process at ${this.binaryPath} with arguments ${chromiumArgs}`);
      let chromium;
      try {
        chromium = spawn(this.binaryPath, chromiumArgs);
      } catch (err) {
        observer.error(new Error(`Caught error spawning Chromium`));
        return;
      }

      safeChildProcess(chromium, observer);

      const stderr$ = Rx.fromEvent(chromium.stderr, 'data').pipe(
        map(line => line.toString()),
        share()
      );

      const [ consoleMessage$, message$ ] = stderr$.pipe(
        partition(msg => msg.match(/\[\d+\/\d+.\d+:\w+:CONSOLE\(\d+\)\]/))
      );

      const driver$ = message$.pipe(
        first(line => line.indexOf(`DevTools listening on ws://127.0.0.1:${bridgePort}`) >= 0),
        tap(() => this.logger.debug('Ensure chromium is running and listening')),
        mergeMap(() => ensureChromiumIsListening(bridgePort, this.logger)),
        tap(() => this.logger.debug('Connecting chrome remote interface')),
        mergeMap(() => cdp({ port: bridgePort, local: true })),
        tap(() => this.logger.debug('Initializing chromium driver')),
        map(client => new HeadlessChromiumDriver(client, {
          maxScreenshotDimension: this.browserConfig.maxScreenshotDimension,
          logger: this.logger
        }))
      );

      const processError$ = Rx.fromEvent(chromium, 'error').pipe(
        mergeMap(() => Rx.throwError(new Error(`Unable to spawn Chromium`))),
      );

      const processExit$ = Rx.fromEvent(chromium, 'exit').pipe(
        mergeMap(([code]) => Rx.throwError(new Error(`Chromium exited with code: ${code}. ${exitCodeSuggestion(code)}`)))
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

      // unsubscribe logic makes a best-effort attempt to delete the user data directory used by chromium
      return () => {
        this.logger.debug(`deleting chromium user data directory at ${userDataDir}`);
        // the unsubscribe function isn't `async` so we're going to make our best effort at
        // deleting the userDataDir and if it fails log an error.
        rimraf(userDataDir, (err) => {
          if (err) {
            return this.logger.error(`error deleting user data directory at ${userDataDir}: ${err}`);
          }
        });
      };
    });
  }
}
