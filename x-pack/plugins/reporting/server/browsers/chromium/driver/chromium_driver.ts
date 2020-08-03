/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { map, truncate } from 'lodash';
import open from 'opn';
import { ElementHandle, EvaluateFn, Page, Response, SerializableOrJSHandle } from 'puppeteer';
import { parse as parseUrl } from 'url';
import { LevelLogger } from '../../../lib';
import { ViewZoomWidthHeight } from '../../../lib/layouts/layout';
import { ConditionalHeaders, ElementPosition } from '../../../types';
import { allowRequest, NetworkPolicy } from '../../network_policy';

export interface ChromiumDriverOptions {
  inspect: boolean;
  networkPolicy: NetworkPolicy;
}

interface WaitForSelectorOpts {
  timeout: number;
}

interface EvaluateOpts {
  fn: EvaluateFn;
  args: SerializableOrJSHandle[];
}

interface EvaluateMetaOpts {
  context: string;
}

type ConditionalHeadersConditions = ConditionalHeaders['conditions'];

interface InterceptedRequest {
  requestId: string;
  request: {
    url: string;
    method: string;
    headers: {
      [key: string]: string;
    };
    initialPriority: string;
    referrerPolicy: string;
  };
  frameId: string;
  resourceType: string;
}

const WAIT_FOR_DELAY_MS: number = 100;

export class HeadlessChromiumDriver {
  private readonly page: Page;
  private readonly inspect: boolean;
  private readonly networkPolicy: NetworkPolicy;

  private listenersAttached = false;
  private interceptedCount = 0;

  constructor(page: Page, { inspect, networkPolicy }: ChromiumDriverOptions) {
    this.page = page;
    this.inspect = inspect;
    this.networkPolicy = networkPolicy;
  }

  private allowRequest(url: string) {
    return !this.networkPolicy.enabled || allowRequest(url, this.networkPolicy.rules);
  }

  private truncateUrl(url: string) {
    return truncate(url, {
      length: 100,
      omission: '[truncated]',
    });
  }

  public async open(
    url: string,
    {
      conditionalHeaders,
      waitForSelector: pageLoadSelector,
      timeout,
    }: {
      conditionalHeaders: ConditionalHeaders;
      waitForSelector: string;
      timeout: number;
    },
    logger: LevelLogger
  ): Promise<void> {
    logger.info(`opening url ${url}`);

    // Reset intercepted request count
    this.interceptedCount = 0;

    await this.page.setRequestInterception(true);

    this.registerListeners(conditionalHeaders, logger);

    await this.page.goto(url, { waitUntil: 'domcontentloaded' });

    if (this.inspect) {
      await this.launchDebugger();
    }

    await this.waitForSelector(
      pageLoadSelector,
      { timeout },
      { context: 'waiting for page load selector' },
      logger
    );
    logger.info(`handled ${this.interceptedCount} page requests`);
  }

  public async screenshot(elementPosition: ElementPosition): Promise<string> {
    const { boundingClientRect, scroll } = elementPosition;
    const screenshot = await this.page.screenshot({
      clip: {
        x: boundingClientRect.left + scroll.x,
        y: boundingClientRect.top + scroll.y,
        height: boundingClientRect.height,
        width: boundingClientRect.width,
      },
    });

    return screenshot.toString('base64');
  }

  public async evaluate(
    { fn, args = [] }: EvaluateOpts,
    meta: EvaluateMetaOpts,
    logger: LevelLogger
  ) {
    logger.debug(`evaluate ${meta.context}`);
    const result = await this.page.evaluate(fn, ...args);
    return result;
  }

  public async waitForSelector(
    selector: string,
    opts: WaitForSelectorOpts,
    context: EvaluateMetaOpts,
    logger: LevelLogger
  ): Promise<ElementHandle<Element>> {
    const { timeout } = opts;
    logger.debug(`waitForSelector ${selector}`);
    const resp = await this.page.waitFor(selector, { timeout }); // override default 30000ms
    logger.debug(`waitForSelector ${selector} resolved`);
    return resp;
  }

  public async waitFor(
    {
      fn,
      args,
      toEqual,
      timeout,
    }: {
      fn: EvaluateFn;
      args: SerializableOrJSHandle[];
      toEqual: number;
      timeout: number;
    },
    context: EvaluateMetaOpts,
    logger: LevelLogger
  ): Promise<void> {
    const startTime = Date.now();

    while (true) {
      const result = await this.evaluate({ fn, args }, context, logger);
      if (result === toEqual) {
        return;
      }

      if (Date.now() - startTime > timeout) {
        throw new Error(
          `Timed out waiting for the items selected to equal ${toEqual}. Found: ${result}. Context: ${context.context}`
        );
      }
      await new Promise((r) => setTimeout(r, WAIT_FOR_DELAY_MS));
    }
  }

  public async setViewport(
    { width, height, zoom }: ViewZoomWidthHeight,
    logger: LevelLogger
  ): Promise<void> {
    logger.debug(`Setting viewport to width: ${width}, height: ${height}, zoom: ${zoom}`);

    await this.page.setViewport({
      width: Math.floor(width / zoom),
      height: Math.floor(height / zoom),
      deviceScaleFactor: zoom,
      isMobile: false,
    });
  }

  private registerListeners(conditionalHeaders: ConditionalHeaders, logger: LevelLogger) {
    if (this.listenersAttached) {
      return;
    }

    // @ts-ignore
    const client = this.page._client;

    // We have to reach into the Chrome Devtools Protocol to apply headers as using
    // puppeteer's API will cause map tile requests to hang indefinitely:
    //    https://github.com/puppeteer/puppeteer/issues/5003
    // Docs on this client/protocol can be found here:
    //    https://chromedevtools.github.io/devtools-protocol/tot/Fetch
    client.on('Fetch.requestPaused', async (interceptedRequest: InterceptedRequest) => {
      const {
        requestId,
        request: { url: interceptedUrl },
      } = interceptedRequest;

      const allowed = !interceptedUrl.startsWith('file://');
      const isData = interceptedUrl.startsWith('data:');

      // We should never ever let file protocol requests go through
      if (!allowed || !this.allowRequest(interceptedUrl)) {
        logger.error(`Got bad URL: "${interceptedUrl}", closing browser.`);
        await client.send('Fetch.failRequest', {
          errorReason: 'Aborted',
          requestId,
        });
        this.page.browser().close();
        throw new Error(
          i18n.translate('xpack.reporting.chromiumDriver.disallowedOutgoingUrl', {
            defaultMessage: `Received disallowed outgoing URL: "{interceptedUrl}", exiting`,
            values: { interceptedUrl },
          })
        );
      }

      if (this._shouldUseCustomHeaders(conditionalHeaders.conditions, interceptedUrl)) {
        logger.debug(`Using custom headers for ${interceptedUrl}`);
        const headers = map(
          {
            ...interceptedRequest.request.headers,
            ...conditionalHeaders.headers,
          },
          (value, name) => ({
            name,
            value,
          })
        );

        try {
          await client.send('Fetch.continueRequest', {
            requestId,
            headers,
          });
        } catch (err) {
          logger.error(
            i18n.translate('xpack.reporting.chromiumDriver.failedToCompleteRequestUsingHeaders', {
              defaultMessage: 'Failed to complete a request using headers: {error}',
              values: { error: err },
            })
          );
        }
      } else {
        const loggedUrl = isData ? this.truncateUrl(interceptedUrl) : interceptedUrl;
        logger.debug(`No custom headers for ${loggedUrl}`);
        try {
          await client.send('Fetch.continueRequest', { requestId });
        } catch (err) {
          logger.error(
            i18n.translate('xpack.reporting.chromiumDriver.failedToCompleteRequest', {
              defaultMessage: 'Failed to complete a request: {error}',
              values: { error: err },
            })
          );
        }
      }

      this.interceptedCount = this.interceptedCount + (isData ? 0 : 1);
    });

    // Even though 3xx redirects go through our request
    // handler, we should probably inspect responses just to
    // avoid being bamboozled by some malicious request
    this.page.on('response', (interceptedResponse: Response) => {
      const interceptedUrl = interceptedResponse.url();
      const allowed = !interceptedUrl.startsWith('file://');

      if (!interceptedResponse.ok()) {
        logger.warn(
          `Chromium received a non-OK response (${interceptedResponse.status()}) for request ${interceptedUrl}`
        );
      }

      if (!allowed || !this.allowRequest(interceptedUrl)) {
        logger.error(`Got disallowed URL "${interceptedUrl}", closing browser.`);
        this.page.browser().close();
        throw new Error(`Received disallowed URL in response: ${interceptedUrl}`);
      }
    });

    this.listenersAttached = true;
  }

  private async launchDebugger() {
    // In order to pause on execution we have to reach more deeply into Chromiums Devtools Protocol,
    // and more specifically, for the page being used. _client is per-page, and puppeteer doesn't expose
    // a page's client in their api, so we have to reach into internals to get this behavior.
    // Finally, in order to get the inspector running, we have to know the page's internal ID (again, private)
    // in order to construct the final debugging URL.

    // @ts-ignore
    await this.page._client.send('Debugger.enable');
    // @ts-ignore
    await this.page._client.send('Debugger.pause');
    // @ts-ignore
    const targetId = this.page._target._targetId;
    const wsEndpoint = this.page.browser().wsEndpoint();
    const { port } = parseUrl(wsEndpoint);

    open(
      `http://localhost:${port}/devtools/inspector.html?ws=localhost:${port}/devtools/page/${targetId}`
    );
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
