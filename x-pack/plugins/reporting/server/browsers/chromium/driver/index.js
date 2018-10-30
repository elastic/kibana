/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import path from 'path';
import moment from 'moment';
import { parse as parseUrl } from 'url';
import { promisify, delay } from 'bluebird';
import { transformFn } from './transform_fn';
import { ignoreSSLErrorsBehavior } from './ignore_ssl_errors';
import { screenshotStitcher, CapturePngSizeError } from './screenshot_stitcher';

export class HeadlessChromiumDriver {
  constructor(client, { maxScreenshotDimension, logger }) {
    this._client = client;
    this._maxScreenshotDimension = maxScreenshotDimension;
    this._waitForDelayMs = 100;
    this._zoom = 1;
    this._logger = logger;
  }

  async evaluate({ fn, args = [], awaitPromise = false, returnByValue = false }) {
    const { Runtime } = this._client;

    const serializedArgs = args.map(arg => JSON.stringify(arg)).join(',');
    const expression = `(${transformFn(fn)})(${serializedArgs})`;
    const result = await Runtime.evaluate({ expression, awaitPromise, returnByValue });
    return result.result.value;
  }

  async open(url, { conditionalHeaders, waitForSelector }) {
    this._logger.debug(`HeadlessChromiumDriver:opening url ${url}`);
    const { Network, Page } = this._client;
    await Promise.all([
      Network.enable(),
      Page.enable(),
    ]);

    await ignoreSSLErrorsBehavior(this._client.Security);

    Network.requestIntercepted(({ interceptionId, request, authChallenge }) => {
      if (authChallenge) {
        Network.continueInterceptedRequest({
          interceptionId,
          authChallengeResponse: {
            response: 'Default'
          }
        });
        return;
      }
      if (this._shouldUseCustomHeaders(conditionalHeaders.conditions, request.url)) {
        this._logger.debug(`Using custom headers for ${request.url}`);
        Network.continueInterceptedRequest({
          interceptionId,
          headers: {
            ...request.headers,
            ...conditionalHeaders.headers
          }
        });
      } else {
        this._logger.debug(`No custom headers for ${request.url}`);
        Network.continueInterceptedRequest({
          interceptionId
        });
      }
    });
    await Network.setRequestInterception({ patterns: [{ urlPattern: '*' }] });
    await Page.navigate({ url });
    await Page.loadEventFired();
    const { frameTree } = await Page.getResourceTree();
    if (frameTree.frame.unreachableUrl) {
      throw new Error('URL open failed. Is the server running?');
    }
    this.documentNode = await this._client.DOM.getDocument();
    await this.waitForSelector(waitForSelector);
  }

  async record(recordPath) {
    const { Page } = this._client;

    await promisify(fs.mkdir, fs)(recordPath);
    await Page.startScreencast();

    Page.screencastFrame(async ({ data, sessionId }) => {
      await this._writeData(path.join(recordPath, `${moment().utc().format('HH_mm_ss_SSS')}.png`), data);
      await Page.screencastFrameAck({ sessionId });
    });
  }

  async screenshot(elementPosition = null) {
    const { Page } = this._client;

    let outputClip;
    if (!elementPosition) {
      const { layoutViewport } = await Page.getLayoutMetrics();
      outputClip = {
        x: layoutViewport.pageX,
        y: layoutViewport.pageY,
        width: layoutViewport.clientWidth,
        height: layoutViewport.clientHeight,
      };
    } else {
      const { boundingClientRect, scroll = { x: 0, y: 0 } } = elementPosition;
      outputClip = {
        x: boundingClientRect.left + scroll.x,
        y: boundingClientRect.top + scroll.y,
        height: boundingClientRect.height,
        width: boundingClientRect.width,
      };
    }

    // Wrapping screenshotStitcher function call in a retry because of this bug:
    // https://github.com/elastic/kibana/issues/19563. The reason was never found - it only appeared on ci and
    // debug logic right after Page.captureScreenshot to ensure the correct size made the bug disappear.
    let retryCount = 0;
    const MAX_RETRIES = 3;
    while (true) {
      try {
        return await screenshotStitcher(outputClip, this._zoom, this._maxScreenshotDimension, async screenshotClip => {
          const { data } = await Page.captureScreenshot({
            clip: {
              ...screenshotClip,
              scale: 1
            }
          });
          this._logger.debug(`Captured screenshot clip ${JSON.stringify(screenshotClip)}`);
          return data;
        }, this._logger);
      } catch (error) {
        const isCapturePngSizeError = error instanceof CapturePngSizeError;
        if (!isCapturePngSizeError || retryCount === MAX_RETRIES) {
          throw error;
        } else {
          this._logger.error(error.message);
          this._logger.error('Trying again...');
          retryCount++;
        }
      }
    }
  }

  async _writeData(writePath, base64EncodedData) {
    const buffer = Buffer.from(base64EncodedData, 'base64');
    await promisify(fs.writeFile, fs)(writePath, buffer);
  }

  async setViewport({ width, height, zoom }) {
    this._logger.debug(`Setting viewport to width: ${width}, height: ${height}, zoom: ${zoom}`);
    const { Emulation } = this._client;

    await Emulation.setDeviceMetricsOverride({
      width: Math.floor(width / zoom),
      height: Math.floor(height / zoom),
      deviceScaleFactor: zoom,
      mobile: false,
    });

    this._zoom = zoom;
  }

  async waitFor({ fn, args, toEqual }) {
    while ((await this.evaluate({ fn, args })) !== toEqual) {
      await delay(this._waitForDelayMs);
    }
  }

  async waitForSelector(selector) {
    while (true) {
      const { nodeId } = await this._client.DOM.querySelector({ nodeId: this.documentNode.root.nodeId, selector });
      if (nodeId) {
        break;
      }

      await delay(this._waitForDelayMs);
    }
  }

  _shouldUseCustomHeaders(conditions, url) {
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

  _shouldUseCustomHeadersForPort(
    conditions,
    port
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
