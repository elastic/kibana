/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { truncate } from 'lodash';
import open from 'opn';
import puppeteer, { ElementHandle, EvaluateFn, Page, SerializableOrJSHandle } from 'puppeteer';
import { parse as parseUrl } from 'url';
import { Headers, Logger } from '@kbn/core/server';
import {
  KBN_SCREENSHOT_MODE_HEADER,
  ScreenshotModePluginSetup,
} from '@kbn/screenshot-mode-plugin/server';
import { ConfigType } from '../../config';
import { allowRequest } from '../network_policy';
import { stripUnsafeHeaders } from './strip_unsafe_headers';

export type Context = Record<string, unknown>;

export interface ElementPosition {
  boundingClientRect: {
    // modern browsers support x/y, but older ones don't
    top: number;
    left: number;
    width: number;
    height: number;
  };
  scroll: {
    x: number;
    y: number;
  };
}

export interface Viewport {
  zoom: number;
  width: number;
  height: number;
}

interface OpenOptions {
  context?: Context;
  headers: Headers;
  waitForSelector: string;
  timeout: number;
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

function getDisallowedOutgoingUrlError(interceptedUrl: string) {
  return new Error(
    `Received disallowed outgoing URL: "${interceptedUrl}". Failing the request and closing the browser.`
  );
}

/**
 * @internal
 */
export class HeadlessChromiumDriver {
  private listenersAttached = false;
  private interceptedCount = 0;

  constructor(
    private screenshotMode: ScreenshotModePluginSetup,
    private config: ConfigType,
    private basePath: string,
    private readonly page: Page
  ) {}

  private allowRequest(url: string) {
    return !this.config.networkPolicy.enabled || allowRequest(url, this.config.networkPolicy.rules);
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
  async open(
    url: string,
    { headers, context, waitForSelector: pageLoadSelector, timeout }: OpenOptions,
    logger: Logger
  ): Promise<void> {
    logger.info(`opening url ${url}`);

    // Reset intercepted request count
    this.interceptedCount = 0;

    /**
     * Integrate with the screenshot mode plugin contract by calling this function before any other
     * scripts have run on the browser page.
     */
    await this.page.evaluateOnNewDocument(this.screenshotMode.setScreenshotModeEnabled);

    for (const [key, value] of Object.entries(context ?? {})) {
      await this.page.evaluateOnNewDocument(this.screenshotMode.setScreenshotContext, key, value);
    }

    await this.page.setRequestInterception(true);
    this.registerListeners(url, headers, logger);
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });

    if (this.config.browser.chromium.inspect) {
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
  isPageOpen() {
    return !this.page.isClosed();
  }

  async printA4Pdf(): Promise<Buffer> {
    return this.page.pdf({
      format: 'a4',
      preferCSSPageSize: true,
      scale: 1,
      landscape: false,
      displayHeaderFooter: true,
    });
  }

  /*
   * Call Page.screenshot and return a base64-encoded string of the image
   */
  async screenshot(elementPosition: ElementPosition): Promise<Buffer | undefined> {
    const { boundingClientRect, scroll } = elementPosition;
    const screenshot = await this.page.screenshot({
      clip: {
        x: boundingClientRect.left + scroll.x,
        y: boundingClientRect.top + scroll.y,
        height: boundingClientRect.height,
        width: boundingClientRect.width,
      },
    });

    if (Buffer.isBuffer(screenshot)) {
      return screenshot;
    }

    if (typeof screenshot === 'string') {
      return Buffer.from(screenshot, 'base64');
    }

    return undefined;
  }

  evaluate({ fn, args = [] }: EvaluateOpts, meta: EvaluateMetaOpts, logger: Logger): Promise<any> {
    logger.debug(`evaluate ${meta.context}`);

    return this.page.evaluate(fn, ...args);
  }

  async waitForSelector(
    selector: string,
    opts: WaitForSelectorOpts,
    context: EvaluateMetaOpts,
    logger: Logger
  ): Promise<ElementHandle<Element>> {
    const { timeout } = opts;
    logger.debug(`waitForSelector ${selector}`);
    const response = await this.page.waitForSelector(selector, { timeout }); // override default 30000ms

    if (!response) {
      throw new Error(`Failure in waitForSelector: void response! Context: ${context.context}`);
    }

    logger.debug(`waitForSelector ${selector} resolved`);
    return response;
  }

  public async waitFor({
    fn,
    args,
    timeout,
  }: {
    fn: EvaluateFn;
    args: SerializableOrJSHandle[];
    timeout: number;
  }): Promise<void> {
    await this.page.waitForFunction(fn, { timeout, polling: WAIT_FOR_DELAY_MS }, ...args);
  }

  async setViewport(
    { width: _width, height: _height, zoom }: Viewport,
    logger: Logger
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

  private registerListeners(url: string, customHeaders: Headers, logger: Logger) {
    if (this.listenersAttached) {
      return;
    }

    // FIXME: retrieve the client in open() and  pass in the client
    const client = this.page.client();

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

      if (this._shouldUseCustomHeaders(url, interceptedUrl)) {
        logger.trace(`Using custom headers for ${interceptedUrl}`);
        const headers = Object.entries({
          ...interceptedRequest.request.headers,
          ...stripUnsafeHeaders(customHeaders),
          [KBN_SCREENSHOT_MODE_HEADER]: 'true',
        }).flatMap(([name, rawValue]) => {
          const values = Array.isArray(rawValue) ? rawValue : [rawValue ?? ''];

          return values.map((value) => ({ name, value }));
        });

        try {
          await client.send('Fetch.continueRequest', {
            requestId,
            headers,
          });
        } catch (err) {
          logger.error(`Failed to complete a request using headers: ${err.message}`);
        }
      } else {
        const loggedUrl = isData ? this.truncateUrl(interceptedUrl) : interceptedUrl;
        logger.trace(`No custom headers for ${loggedUrl}`);
        try {
          await client.send('Fetch.continueRequest', { requestId });
        } catch (err) {
          logger.error(`Failed to complete a request: ${err.message}`);
        }
      }

      this.interceptedCount = this.interceptedCount + (isData ? 0 : 1);
    });

    this.page.on('response', (interceptedResponse: puppeteer.HTTPResponse) => {
      const interceptedUrl = interceptedResponse.url();
      const allowed = !interceptedUrl.startsWith('file://');
      const status = interceptedResponse.status();

      if (status >= 400 && !interceptedResponse.ok()) {
        logger.warn(
          `Chromium received a non-OK response (${status}) for request ${interceptedUrl}`
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
    const targetId = target._targetId;
    const wsEndpoint = this.page.browser().wsEndpoint();
    const { port } = parseUrl(wsEndpoint);

    open(
      `http://localhost:${port}/devtools/inspector.html?ws=localhost:${port}/devtools/page/${targetId}`
    );
  }

  private _shouldUseCustomHeaders(sourceUrl: string, targetUrl: string) {
    const {
      hostname: sourceHostname,
      protocol: sourceProtocol,
      port: sourcePort,
    } = parseUrl(sourceUrl);
    const {
      hostname: targetHostname,
      protocol: targetProtocol,
      port: targetPort,
      pathname: targetPathname,
    } = parseUrl(targetUrl);

    if (targetPathname === null) {
      throw new Error(`URL missing pathname: ${targetUrl}`);
    }

    // `port` is null in URLs that don't explicitly state it,
    // however we can derive the port from the protocol (http/https)
    // IE: https://feeds-staging.elastic.co/kibana/v8.0.0.json
    const derivedPort = (protocol: string | null, port: string | null, url: string) => {
      if (port) {
        return port;
      }

      if (protocol === 'http:') {
        return '80';
      }

      if (protocol === 'https:') {
        return '443';
      }

      throw new Error(`URL missing port: ${url}`);
    };

    return (
      sourceHostname === targetHostname &&
      sourceProtocol === targetProtocol &&
      derivedPort(sourceProtocol, sourcePort, sourceUrl) ===
        derivedPort(targetProtocol, targetPort, targetUrl) &&
      targetPathname.startsWith(`${this.basePath}/`)
    );
  }
}
