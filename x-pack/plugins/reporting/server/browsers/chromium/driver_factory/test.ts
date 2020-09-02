/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { spawn } from 'child_process';
import del from 'del';
import { mkdtempSync } from 'fs';
import { once, uniq } from 'lodash';
import { tmpdir } from 'os';
import { join } from 'path';
import { createInterface } from 'readline';
import { ReportingCore } from '../../..';
import { BROWSER_TEST_COMMON_ISSUES } from '../../../../constants';
import { LevelLogger } from '../../../lib';
import { getBinaryPath } from '../../install';
import { args } from './args';

const browserLaunchTimeToWait = 10 * 1000;
const browserCoolDown = 3 * 1000;
const sleep = (time: number) => new Promise((r) => setTimeout(r, time));

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

interface BrowserDiagnosticPayload {
  help: string[];
  success: boolean;
  logs: string;
}

export const browserTest = (
  core: ReportingCore,
  logger: LevelLogger,
  flags: string[] = []
): Promise<BrowserDiagnosticPayload> => {
  const config = core.getConfig();
  const proxy = config.get('capture', 'browser', 'chromium', 'proxy');
  const disableSandbox = config.get('capture', 'browser', 'chromium', 'disableSandbox');
  const userDataDir = mkdtempSync(join(tmpdir(), 'chromium-'));
  const binaryPath = getBinaryPath();
  const kbnArgs = args({
    userDataDir,
    viewport: { width: 800, height: 600 },
    disableSandbox,
    proxy,
  });
  const finalArgs = uniq([...defaultArgs, ...kbnArgs, ...flags]);
  let browserLogs = '';

  const browserProcess = spawn(binaryPath, finalArgs, {
    // On non-windows platforms, `detached: true` makes child process a
    // leader of a new process group, making it possible to kill child
    // process tree with `.kill(-pid)` command. @see
    // https://nodejs.org/api/child_process.html#child_process_options_detached
    detached: process.platform !== 'win32',
  });

  return new Promise((resolve) => {
    const rl = createInterface({ input: browserProcess.stderr });

    const timer = setTimeout(
      () =>
        doneOnce(
          new Error(
            i18n.translate('xpack.reporting.diagnostic.browserLaunchTimedout', {
              defaultMessage: `Browser didn't bind successfully in {browserLaunchTimeToWait} milliseconds`,
              values: {
                browserLaunchTimeToWait,
              },
            })
          )
        ),
      browserLaunchTimeToWait
    );

    rl.on('line', (data) => {
      logger.debug(`Browser log output: "${data}"`);
      browserLogs += data + '\n';
      const match = data.match(/^DevTools listening on/);
      if (match) {
        logger.info(`Browser successfully started remote DevTools listener`);
        return doneOnce();
      }
    });

    browserProcess.once('exit', () =>
      doneOnce(
        new Error(
          i18n.translate('xpack.reporting.diagnostic.browserCrashed', {
            defaultMessage: `Browser exited abnormally during startup`,
          })
        )
      )
    );

    browserProcess.on('error', () => doneOnce(new Error(`Browser errored abnormally`)));

    const doneOnce = once(async (err?: Error) => {
      if (err) {
        logger.error(`Browser didn't start or didn't bind to the local port in time`);
        logger.error(err);
      }
      const help: BrowserDiagnosticPayload['help'] = [];
      clearTimeout(timer);

      // Sometimes logs with significant issues can creep in after browser has bound it's remote
      // debugging port, so let them flow through before SIGKILL is sent.
      await sleep(browserCoolDown);

      browserProcess.removeAllListeners();
      rl.removeAllListeners();
      rl.close();

      for (const knownIssue of BROWSER_TEST_COMMON_ISSUES.keys()) {
        const helpText = BROWSER_TEST_COMMON_ISSUES.get(knownIssue);
        if (browserLogs.includes(knownIssue) && helpText) {
          logger.warn(helpText);
          help.push(helpText);
        }
      }

      if (browserProcess && browserProcess.pid && !browserProcess.killed) {
        browserProcess.kill('SIGKILL');
        logger.info(`Successfully sent 'SIGKILL' to browser process (PID: ${browserProcess.pid})`);
      }

      logger.debug(`deleting chromium user data directory at [${userDataDir}]`);

      del(userDataDir, { force: true }).catch((error) => {
        logger.error(`error deleting user data directory at [${userDataDir}]!`);
        logger.error(error);
      });

      return resolve({
        help,
        logs: browserLogs,
        success: !err && !help.length,
      });
    });
  });
};
