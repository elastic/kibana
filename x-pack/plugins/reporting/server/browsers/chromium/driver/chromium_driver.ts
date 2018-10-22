/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Chrome from 'puppeteer';
import {
  ElementPosition,
  EvalArgs,
  EvalFn,
  EvaluateOptions,
  Logger,
  SessionCookie,
  ViewZoomWidthHeight,
} from '../../../../types';

export interface ChromiumDriverOptions {
  logger: Logger;
}

const WAIT_FOR_DELAY_MS: number = 100;

export class HeadlessChromiumDriver {
  private readonly page: Chrome.Page;
  private readonly logger: Logger;

  constructor(page: Chrome.Page, { logger }: ChromiumDriverOptions) {
    this.page = page;
    this.logger = logger;
  }

  public async open(
    url: string,
    {
      sessionCookie,
      waitForSelector,
    }: {
      sessionCookie: SessionCookie;
      waitForSelector: string;
    }
  ) {
    this.logger.debug(`HeadlessChromiumDriver:opening url ${url}`);
    if (sessionCookie) {
      await this.page.setCookie(sessionCookie);
    }

    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await this.page.waitFor(waitForSelector);
  }

  public async screenshot(elementPosition: ElementPosition) {
    let clip;
    if (elementPosition) {
      const { boundingClientRect, scroll = { x: 0, y: 0 } } = elementPosition;
      clip = {
        x: boundingClientRect.left + scroll.x,
        y: boundingClientRect.top + scroll.y,
        height: boundingClientRect.height,
        width: boundingClientRect.width,
      };
    }

    const screenshot = await this.page.screenshot({
      clip,
    });

    return screenshot.toString('base64');
  }

  public async evaluate({ fn, args = [] }: EvaluateOptions) {
    const result = await this.page.evaluate(fn, ...args);
    return result;
  }

  public waitForSelector(selector: string) {
    return this.page.waitFor(selector);
  }

  public async waitFor<T>({ fn, args, toEqual }: { fn: EvalFn<T>; args: EvalArgs; toEqual: T }) {
    while (true) {
      const result = await this.evaluate({ fn, args });
      if (result === toEqual) {
        return;
      }

      await new Promise(r => setTimeout(r, WAIT_FOR_DELAY_MS));
    }
  }

  public async setViewport({ width, height, zoom }: ViewZoomWidthHeight) {
    this.logger.debug(`Setting viewport to width: ${width}, height: ${height}, zoom: ${zoom}`);

    await this.page.setViewport({
      width: Math.floor(width / zoom),
      height: Math.floor(height / zoom),
      deviceScaleFactor: zoom,
      isMobile: false,
    });
  }
}
