/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { uniq } from 'lodash';
import { BROWSER_TEST_COMMON_ISSUES } from '../../../../constants';

const maxTimeToWait = 10 * 1000;
const chromiumCoolDown = 3 * 1000;
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
  chromiumLogs: string;
}

export const chromiumTest = (
  executablePath: string,
  args: string[] = []
): Promise<BrowserDiagnosticPayload> => {
  let closed = false;
  const finalArgs = uniq([...defaultArgs, ...args]);
  let chromiumLogs = '';

  const browserProcess = spawn(executablePath, finalArgs, {
    // On non-windows platforms, `detached: true` makes child process a
    // leader of a new process group, making it possible to kill child
    // process tree with `.kill(-pid)` command. @see
    // https://nodejs.org/api/child_process.html#child_process_options_detached
    detached: process.platform !== 'win32',
  });

  return new Promise((resolve) => {
    const cleanup = async (err?: Error) => {
      const help: BrowserDiagnosticPayload['help'] = [];
      if (closed) return;
      closed = true;
      clearTimeout(timer);
      rl.close();
      rl.removeAllListeners();
      browserProcess.removeAllListeners();

      // Sometimes logs with significant issues can creep in after chromium has bound it's remote
      // debugging port, so let them flow through before calling it.
      await sleep(chromiumCoolDown);

      for (const knownIssue of BROWSER_TEST_COMMON_ISSUES.keys()) {
        if (chromiumLogs.includes(knownIssue)) {
          // Not sure why TS can't figure out that `issue` here is guaranteed to be a string...
          help.push(BROWSER_TEST_COMMON_ISSUES.get(knownIssue) as string);
        }
      }

      resolve({
        help,
        chromiumLogs,
        browserStartedSuccessfully: !err,
      });

      if (browserProcess && browserProcess.pid && !browserProcess.killed) {
        try {
          browserProcess.kill('SIGKILL');
        } catch (error) {
          throw new Error(
            `Reporting was unable to close the browser process (PID: ${browserProcess.pid}). Please check your open processes and ensure that the browser processes that Reporting has launched have been killed.\nError cause: ${error.stack}`
          );
        }
      }
    };

    const rl = createInterface({ input: browserProcess.stderr });
    const timer = setTimeout(
      () => cleanup(new Error(`Browser didn't bind successfully in ${maxTimeToWait} milliseconds`)),
      maxTimeToWait
    );

    rl.on('line', (data) => {
      chromiumLogs += data + '\n';
      const match = data.match(/^DevTools listening on (ws:\/\/.*)$/);
      if (match) {
        return cleanup();
      }
    });

    browserProcess.once('exit', () =>
      cleanup(new Error(`Browser exited abnormally during startup`))
    );
  });
};
