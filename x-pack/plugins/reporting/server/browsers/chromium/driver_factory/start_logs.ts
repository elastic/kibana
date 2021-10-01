/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { spawn } from 'child_process';
import del from 'del';
import { mkdtempSync } from 'fs';
import { uniq } from 'lodash';
import os from 'os';
import { join } from 'path';
import { createInterface } from 'readline';
import { getDataPath } from '@kbn/utils';
import { fromEvent, merge, of, timer } from 'rxjs';
import { catchError, map, reduce, takeUntil, tap } from 'rxjs/operators';
import { ReportingCore } from '../../../';
import { LevelLogger } from '../../../lib';
import { ChromiumArchivePaths } from '../paths';
import { args } from './args';

const paths = new ChromiumArchivePaths();
const browserLaunchTimeToWait = 5 * 1000;

// Default args used by pptr
// https://github.com/puppeteer/puppeteer/blob/13ea347/src/node/Launcher.ts#L168
const defaultArgs = [
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

export const browserStartLogs = (
  core: ReportingCore,
  logger: LevelLogger,
  overrideFlags: string[] = []
) => {
  const config = core.getConfig();
  const proxy = config.get('capture', 'browser', 'chromium', 'proxy');
  const disableSandbox = config.get('capture', 'browser', 'chromium', 'disableSandbox');
  const userDataDir = mkdtempSync(join(getDataPath(), 'chromium-'));

  const platform = process.platform;
  const architecture = os.arch();
  const pkg = paths.find(platform, architecture);
  if (!pkg) {
    throw new Error(`Unsupported platform: ${platform}-${architecture}`);
  }
  const binaryPath = paths.getBinaryPath(pkg);

  const kbnArgs = args({
    userDataDir,
    viewport: { width: 800, height: 600 },
    disableSandbox,
    proxy,
  });
  const finalArgs = uniq([...defaultArgs, ...kbnArgs, ...overrideFlags]);

  // On non-windows platforms, `detached: true` makes child process a
  // leader of a new process group, making it possible to kill child
  // process tree with `.kill(-pid)` command. @see
  // https://nodejs.org/api/child_process.html#child_process_options_detached
  const browserProcess = spawn(binaryPath, finalArgs, {
    detached: process.platform !== 'win32',
  });

  const rl = createInterface({ input: browserProcess.stderr });

  const exit$ = fromEvent(browserProcess, 'exit').pipe(
    map((code) => {
      logger.error(`Browser exited abnormally, received code: ${code}`);
      return i18n.translate('xpack.reporting.diagnostic.browserCrashed', {
        defaultMessage: `Browser exited abnormally during startup`,
      });
    })
  );

  const error$ = fromEvent(browserProcess, 'error').pipe(
    map((err) => {
      logger.error(`Browser process threw an error on startup`);
      logger.error(err as string | Error);
      return i18n.translate('xpack.reporting.diagnostic.browserErrored', {
        defaultMessage: `Browser process threw an error on startup`,
      });
    })
  );

  const browserProcessLogger = logger.clone(['chromium-stderr']);
  const log$ = fromEvent(rl, 'line').pipe(
    tap((message: unknown) => {
      if (typeof message === 'string') {
        browserProcessLogger.info(message);
      }
    })
  );

  // Collect all events (exit, error and on log-lines), but let chromium keep spitting out
  // logs as sometimes it's "bind" successfully for remote connections, but later emit
  // a log indicative of an issue (for example, no default font found).
  return merge(exit$, error$, log$).pipe(
    takeUntil(timer(browserLaunchTimeToWait)),
    reduce((acc, curr) => `${acc}${curr}\n`, ''),
    tap(() => {
      if (browserProcess && browserProcess.pid && !browserProcess.killed) {
        browserProcess.kill('SIGKILL');
        logger.info(`Successfully sent 'SIGKILL' to browser process (PID: ${browserProcess.pid})`);
      }
      browserProcess.removeAllListeners();
      rl.removeAllListeners();
      rl.close();
      del(userDataDir, { force: true }).catch((error) => {
        logger.error(`Error deleting user data directory at [${userDataDir}]!`);
        logger.error(error);
      });
    }),
    catchError((error) => {
      logger.error(error);
      return of(error);
    })
  );
};
