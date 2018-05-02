/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Rx from 'rxjs/Rx';
import phantom from '@elastic/node-phantom-simple';
import { getPhantomOptions } from './phantom_options';
import { PhantomDriver } from '../driver';
import { promisify } from 'bluebird';
import { safeChildProcess } from '../../safe_child_process';


export class PhantomDriverFactory {
  constructor(binaryPath) {
    this.binaryPath = binaryPath;
  }

  type = 'phantom';

  create({ bridgePort, viewport, zoom, logger }) {
    return Rx.Observable.create(observer => {
      let killed = false;
      let browser;
      let page;

      (async () => {
        const phantomOptions = getPhantomOptions({
          phantomPath: this.binaryPath,
          bridgePort
        });

        try {
          browser = await promisify(phantom.create)(phantomOptions);
          if (killed) {
            return;
          }

          safeChildProcess(browser.process, observer);

          page = await promisify(browser.createPage)();
          if (killed) {
            return;
          }

          await promisify(page.set)('viewportSize', viewport);
          if (killed) {
            return;
          }
        } catch (err) {
          const message = err.toString();

          if (message.includes('Phantom immediately exited with: 126')) {
            observer.error(new Error('Cannot execute phantom binary, incorrect format'));
            return;
          }

          if (message.includes('Phantom immediately exited with: 127')) {
            observer.error(Error('You must install fontconfig and freetype for Reporting to work'));
            return;
          }

          observer.error(err);
          return;
        }

        const exit$ = Rx.Observable.fromEvent(browser.process, 'exit')
          .mergeMap(code => Rx.Observable.throw(new Error(`Phantom exited with code: ${code}`)));

        const driver = new PhantomDriver({
          page,
          browser,
          zoom,
          logger,
        });
        const driver$ = Rx.Observable.of(driver);

        const consoleMessage$ = Rx.Observable.fromEventPattern(handler => {
          page.onConsoleMessage = handler;
        }, () => {
          page.onConsoleMessage = null;
        });

        const message$ = Rx.Observable.never();

        observer.next({
          driver$,
          message$,
          consoleMessage$,
          exit$
        });
      })();

      return () => {
        killed = true;
      };
    });
  }
}

