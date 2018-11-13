/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Chrome from 'puppeteer';
import { parse as parseUrl } from 'url';
import {
  ConditionalHeaders,
  ConditionalHeadersConditions,
  ElementPosition,
  EvalArgs,
  EvalFn,
  EvaluateOptions,
  Logger,
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
      conditionalHeaders,
      waitForSelector,
    }: { conditionalHeaders: ConditionalHeaders; waitForSelector: string }
  ) {
    this.logger.debug(`HeadlessChromiumDriver:opening url ${url}`);
    await this.page.setRequestInterception(true);
    this.page.on('request', (interceptedRequest: any) => {
      if (this._shouldUseCustomHeaders(conditionalHeaders.conditions, interceptedRequest.url())) {
        this.logger.debug(`Using custom headers for ${interceptedRequest.url()}`);
        interceptedRequest.continue({
          headers: {
            ...interceptedRequest.headers(),
            ...conditionalHeaders.headers,
          },
        });
      } else {
        this.logger.debug(`No custom headers for ${interceptedRequest.url()}`);
        interceptedRequest.continue();
      }
    });

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

  private _shouldUseCustomHeaders(conditions: ConditionalHeadersConditions, url: string) {
    const { hostname, protocol, port, pathname } = parseUrl(url);

    if (pathname === undefined) {
      // There's a discrepancy between the NodeJS docs and the typescript types. NodeJS docs
      // just say 'string' and the typescript types say 'string | undefined'. We haven't hit a
      // situation where it's undefined but here's an explicit Error if we do.
      throw new Error(`pathname is undefined, don't know how to proceed`);
    }

    return (
      hostname === conditions.hostname &&
      protocol === `${conditions.protocol}:` &&
      this._shouldUseCustomHeadersForPort(conditions, port) &&
      pathname.startsWith(`${conditions.basePath}/`)
    );
  }

  private _shouldUseCustomHeadersForPort(
    conditions: ConditionalHeadersConditions,
    port: string | undefined
  ) {
    if (conditions.protocol === 'http' && conditions.port === 80) {
      return (
        port === undefined || port === null || port === '' || port === conditions.port.toString()
      );
    }

    if (conditions.protocol === 'https' && conditions.port === 443) {
      return (
        port === undefined || port === null || port === '' || port === conditions.port.toString()
      );
    }

    return port === conditions.port.toString();
  }
}
