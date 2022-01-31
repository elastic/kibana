/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { map, truncate } from 'lodash';
import open from 'opn';
import puppeteer, { ElementHandle, EvaluateFn, Page, SerializableOrJSHandle } from 'puppeteer';
import { parse as parseUrl } from 'url';
import { Logger } from 'src/core/server';
import type { Layout } from 'src/plugins/screenshot_mode/common';
import {
  KBN_SCREENSHOT_MODE_HEADER,
  ScreenshotModePluginSetup,
} from '../../../../../../src/plugins/screenshot_mode/server';
import { Context, SCREENSHOTTING_CONTEXT_KEY } from '../../../common/context';
import { ConfigType } from '../../config';
import { allowRequest } from '../network_policy';

export interface ConditionalHeadersConditions {
  protocol: string;
  hostname: string;
  port: number;
  basePath: string;
}

export interface ConditionalHeaders {
  headers: Record<string, string>;
  conditions: ConditionalHeadersConditions;
}

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
  conditionalHeaders: ConditionalHeaders;
  context?: Context;
  waitForSelector: string;
  timeout: number;
  layout?: Layout;
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
    i18n.translate('xpack.screenshotting.chromiumDriver.disallowedOutgoingUrl', {
      defaultMessage: `Received disallowed outgoing URL: "{interceptedUrl}". Failing the request and closing the browser.`,
      values: { interceptedUrl },
    })
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
    {
      conditionalHeaders,
      context,
      layout,
      waitForSelector: pageLoadSelector,
      timeout,
    }: OpenOptions,
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

    if (context) {
      await this.page.evaluateOnNewDocument(
        (key: string, value: unknown) => {
          Object.defineProperty(window, key, {
            configurable: false,
            writable: true,
            enumerable: true,
            value,
          });
        },
        SCREENSHOTTING_CONTEXT_KEY,
        context
      );
    }

    if (layout) {
      await this.page.evaluateOnNewDocument(this.screenshotMode.setScreenshotLayout, layout);
    }

    await this.page.setRequestInterception(true);
    this.registerListeners(conditionalHeaders, logger);
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

  private registerListeners(conditionalHeaders: ConditionalHeaders, logger: Logger) {
    if (this.listenersAttached) {
      return;
    }

    // @ts-ignore
    // FIXME: retrieve the client in open() and  pass in the client
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
            [KBN_SCREENSHOT_MODE_HEADER]: 'true',
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
            i18n.translate(
              'xpack.screenshotting.chromiumDriver.failedToCompleteRequestUsingHeaders',
              {
                defaultMessage: 'Failed to complete a request using headers: {error}',
                values: { error: err },
              }
            )
          );
        }
      } else {
        const loggedUrl = isData ? this.truncateUrl(interceptedUrl) : interceptedUrl;
        logger.trace(`No custom headers for ${loggedUrl}`);
        try {
          await client.send('Fetch.continueRequest', { requestId });
        } catch (err) {
          logger.error(
            i18n.translate('xpack.screenshotting.chromiumDriver.failedToCompleteRequest', {
              defaultMessage: 'Failed to complete a request: {error}',
              values: { error: err },
            })
          );
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
