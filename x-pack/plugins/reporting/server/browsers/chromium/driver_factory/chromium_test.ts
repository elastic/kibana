/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { uniq } from 'lodash';
import { BROWSER_TEST_COMMON_ISSUES } from '../../../../constants';
import { LevelLogger } from '../../../lib';

const maxTimeToWait = 10 * 1000;
const browserCoolDown = 3 * 1000;
const sleep = (time: number) => new Promise((r) => setTimeout(r, time));

// Default args used by pptr
// https://github.com/puppeteer/puppeteer/blob/main/src/node/Launcher.ts#L168
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
  browserStartedSuccessfully: boolean;
  browserLogs: string;
}

export const browserTest = (
  executablePath: string,
  args: string[] = [],
  logger: LevelLogger
): Promise<BrowserDiagnosticPayload> => {
  let closed = false;
  const finalArgs = uniq([...defaultArgs, ...args]);
  let browserLogs = '';

  const browserProcess = spawn(executablePath, finalArgs, {
    // On non-windows platforms, `detached: true` makes child process a
    // leader of a new process group, making it possible to kill child
    // process tree with `.kill(-pid)` command. @see
    // https://nodejs.org/api/child_process.html#child_process_options_detached
    detached: process.platform !== 'win32',
  });

  return new Promise((resolve) => {
    const cleanup = async (err?: Error) => {
      if (closed) return;
      if (err) {
        logger.error(`Browser didn't start or didn't bind to the local port in time`);
        logger.error(err);
      }
      const help: BrowserDiagnosticPayload['help'] = [];
      closed = true;
      clearTimeout(timer);
      rl.close();
      rl.removeAllListeners();
      browserProcess.removeAllListeners();

      // Sometimes logs with significant issues can creep in after browser has bound it's remote
      // debugging port, so let them flow through before SIGKILL is sent.
      await sleep(browserCoolDown);

      for (const knownIssue of BROWSER_TEST_COMMON_ISSUES.keys()) {
        if (browserLogs.includes(knownIssue)) {
          // Not sure why TS can't figure out that `issue` here is guaranteed to be a string...
          const helpText = BROWSER_TEST_COMMON_ISSUES.get(knownIssue) as string;
          logger.warn(helpText);
          help.push(helpText);
        }
      }

      if (browserProcess && browserProcess.pid && !browserProcess.killed) {
        try {
          browserProcess.kill('SIGKILL');
        } catch (error) {
          logger.warn(
            `Reporting was unable to close the browser process (PID: ${browserProcess.pid}). Please check your open processes and ensure that the browser processes that Reporting has launched have been killed.\nError cause: ${error.stack}`
          );
        }
      }

      return resolve({
        help,
        browserLogs,
        browserStartedSuccessfully: !err,
      });
    };

    const timer = setTimeout(
      () => cleanup(new Error(`Browser didn't bind successfully in ${maxTimeToWait} milliseconds`)),
      maxTimeToWait
    );

    const rl = createInterface({ input: browserProcess.stderr });
    rl.on('line', (data) => {
      logger.debug(`Browser log output: "${data}"`);
      browserLogs += data + '\n';
      const match = data.match(/^DevTools listening on (ws:\/\/.*)$/);
      if (match) {
        logger.debug(`Browser successfully started remote DevTools listener`);
        return cleanup();
      }
    });

    browserProcess.once('exit', () =>
      cleanup(new Error(`Browser exited abnormally during startup`))
    );
  });
};
