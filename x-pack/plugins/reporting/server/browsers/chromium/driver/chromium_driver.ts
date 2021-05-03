/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { map, truncate } from 'lodash';
import open from 'opn';
import puppeteer, { ElementHandle, EvaluateFn, SerializableOrJSHandle } from 'puppeteer';
import { parse as parseUrl } from 'url';
import { getDisallowedOutgoingUrlError } from '../';
import { ConditionalHeaders, ConditionalHeadersConditions } from '../../../export_types/common';
import { LevelLogger } from '../../../lib';
import { ViewZoomWidthHeight } from '../../../lib/layouts/layout';
import { ElementPosition } from '../../../lib/screenshots';
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
  private readonly page: puppeteer.Page;
  private readonly inspect: boolean;
  private readonly networkPolicy: NetworkPolicy;

  private listenersAttached = false;
  private interceptedCount = 0;

  constructor(page: puppeteer.Page, { inspect, networkPolicy }: ChromiumDriverOptions) {
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

  /*
   * Call Page.goto and wait to see the Kibana DOM content
   */
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

  /*
   * Let modules poll if Chrome is still running so they can short circuit if needed
   */
  public isPageOpen() {
    return !this.page.isClosed();
  }

  /*
   * Call Page.screenshot and return a base64-encoded string of the image
   */
  public async screenshot(elementPosition: ElementPosition): Promise<string | void> {
    const { boundingClientRect, scroll } = elementPosition;
    const screenshot = await this.page.screenshot({
      clip: {
        x: boundingClientRect.left + scroll.x,
        y: boundingClientRect.top + scroll.y,
        height: boundingClientRect.height,
        width: boundingClientRect.width,
      },
    });

    if (screenshot) {
      return screenshot.toString('base64');
    }
    return screenshot;
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
    const resp = await this.page.waitForSelector(selector, { timeout }); // override default 30000ms

    if (!resp) {
      throw new Error(`Failure in waitForSelector: void response! Context: ${context.context}`);
    }

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
    { width: _width, height: _height, zoom }: ViewZoomWidthHeight,
    logger: LevelLogger
  ): Promise<void> {
    const width = Math.floor(_width);
    const height = Math.floor(_height);

    logger.debug(`Setting viewport to: width=${width} height=${height} zoom=${zoom}`);

    await this.page.setViewport({
      width,
      height,
      deviceScaleFactor: zoom,
      isMobile: false,
    });
  }

  private registerListeners(conditionalHeaders: ConditionalHeaders, logger: LevelLogger) {
    if (this.listenersAttached) {
      return;
    }

    // @ts-ignore
    // FIXME: use `await page.target().createCDPSession();`
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
        await client.send('Fetch.failRequest', {
          errorReason: 'Aborted',
          requestId,
        });
        this.page.browser().close();
        logger.error(getDisallowedOutgoingUrlError(interceptedUrl));
        return;
      }

      if (this._shouldUseCustomHeaders(conditionalHeaders.conditions, interceptedUrl)) {
        logger.trace(`Using custom headers for ${interceptedUrl}`);
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
        logger.trace(`No custom headers for ${loggedUrl}`);
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
    this.page.on('response', (interceptedResponse: puppeteer.Response) => {
      const interceptedUrl = interceptedResponse.url();
      const allowed = !interceptedUrl.startsWith('file://');

      if (!interceptedResponse.ok()) {
        logger.warn(
          `Chromium received a non-OK response (${interceptedResponse.status()}) for request ${interceptedUrl}`
        );
      }

      if (!allowed || !this.allowRequest(interceptedUrl)) {
        this.page.browser().close();
        logger.error(getDisallowedOutgoingUrlError(interceptedUrl));
        return;
      }
    });

    this.listenersAttached = true;
  }

  private async launchDebugger() {
    // In order to pause on execution we have to reach more deeply into Chromiums Devtools Protocol,
    // and more specifically, for the page being used. _client is per-page.
    // In order to get the inspector running, we have to know the page's internal ID (again, private)
    // in order to construct the final debugging URL.

    const target = this.page.target();
    const client = await target.createCDPSession();

    await client.send('Debugger.enable');
    await client.send('Debugger.pause');
    // @ts-ignore
    const targetId = target._targetId;
    const wsEndpoint = this.page.browser().wsEndpoint();
    const { port } = parseUrl(wsEndpoint);

    open(
      `http://localhost:${port}/devtools/inspector.html?ws=localhost:${port}/devtools/page/${targetId}`
    );
  }

  private _shouldUseCustomHeaders(conditions: ConditionalHeadersConditions, url: string) {
    const { hostname, protocol, port, pathname } = parseUrl(url);

    // `port` is null in URLs that don't explicitly state it,
    // however we can derive the port from the protocol (http/https)
    // IE: https://feeds-staging.elastic.co/kibana/v8.0.0.json
    const derivedPort = (() => {
      if (port) {
        return port;
      }

      if (protocol === 'http:') {
        return '80';
      }

      if (protocol === 'https:') {
        return '443';
      }

      return null;
    })();

    if (derivedPort === null) throw new Error(`URL missing port: ${url}`);
    if (pathname === null) throw new Error(`URL missing pathname: ${url}`);

    return (
      hostname === conditions.hostname &&
      protocol === `${conditions.protocol}:` &&
      this._shouldUseCustomHeadersForPort(conditions, derivedPort) &&
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
