/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { uniq } from 'lodash';

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

export const start = (executablePath: string, args: string[] = []): Promise<string> => {
  let closed = false;
  const finalArgs = uniq([...defaultArgs, ...args]);
  let errorLogs = '';

  const browserProcess = spawn(executablePath, finalArgs, {
    // On non-windows platforms, `detached: true` makes child process a
    // leader of a new process group, making it possible to kill child
    // process tree with `.kill(-pid)` command. @see
    // https://nodejs.org/api/child_process.html#child_process_options_detached
    detached: process.platform !== 'win32',
  });

  return new Promise((resolve, reject) => {
    const cleanup = (err?: Error) => {
      if (closed) return;
      closed = true;
      clearTimeout(timer);
      rl.close();
      rl.removeAllListeners();
      browserProcess.removeAllListeners();

      if (err) {
        reject(`${err}:\n${errorLogs}`);
      } else {
        resolve();
      }

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
      () => cleanup(new Error(`Browser didn't start successfully in 10 seconds`)),
      10000
    );

    rl.on('line', (data) => {
      errorLogs += data + '\n';
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
