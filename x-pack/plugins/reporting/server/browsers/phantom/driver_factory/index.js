/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Rx from 'rxjs/Rx';
import phantom from '../node-phantom-simple/node-phantom-simple';
import { PhantomDriver } from '../driver';
import { promisify } from 'bluebird';
import { exitCodeSuggestion } from '../../exit_code_suggestion';

export class PhantomDriverFactory {
  constructor(spawnPhantom$) {
    this.spawnPhantom$ = spawnPhantom$;
  }

  type = 'phantom';

  create({ bridgePort, viewport, zoom, logger }) {
    const params = {
      bridgePort
    };
    const phantomProcess$ = this.spawnPhantom$(params);

    return phantomProcess$
      .mergeMap(phantomProcess => {
        return promisify(phantom.create)(phantomProcess);
      })
      .mergeMap(async browser => {
        const page = await promisify(browser.createPage)();
        return { browser, page };
      })
      .mergeMap(async ({ browser, page }) => {
        await promisify(page.set)('viewportSize', viewport);
        return { browser, page };
      })
      .catch(err => {
        const message = err.toString();

        if (message.includes('Phantom immediately exited with: 126')) {
          throw new Error('Cannot execute phantom binary, incorrect format');
        }

        if (message.includes('Phantom immediately exited with: 127')) {
          throw new Error('You must install fontconfig and freetype for Reporting to work');
        }

        throw err;
      })
      .mergeMap(({ browser, page }) => {
        const exit$ = Rx.Observable.fromEvent(browser.process, 'exit')
          .mergeMap(code => Rx.Observable.throw(new Error(`Phantom exited with code: ${code}. ${exitCodeSuggestion(code)}`)));

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

        return Rx.Observable.of({
          driver$,
          message$,
          consoleMessage$,
          exit$
        });
      });
  }
}
