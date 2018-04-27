/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import path from 'path';
import moment from 'moment';
import { promisify, delay } from 'bluebird';
import { transformFn } from './transform_fn';
import { IgnoreSSLErrorsBehavior } from './behaviors';
import { screenshotStitcher } from './screenshot_stitcher';

export class HeadlessChromiumDriver {
  constructor(client, { maxScreenshotDimension, logger }) {
    this._client = client;
    this._maxScreenshotDimension = maxScreenshotDimension;
    this._waitForDelayMs = 100;
    this._zoom = 1;
    this._logger = logger;
    this._behaviors = [
      new IgnoreSSLErrorsBehavior(client),
    ];
  }

  async destroy() {
    this.killed = true;
    await this._client.close();
  }

  async evaluate({ fn, args = [], awaitPromise = false, returnByValue = false }) {
    const { Runtime } = this._client;

    const serializedArgs = args.map(arg => JSON.stringify(arg)).join(',');
    const expression = `(${transformFn(fn)})(${serializedArgs})`;
    const result = await Runtime.evaluate({ expression, awaitPromise, returnByValue });
    return result.result.value;
  }

  async open(url, { headers, waitForSelector }) {
    this._logger.debug(`HeadlessChromiumDriver:opening url ${url}`);
    const { Network, Page } = this._client;
    await Promise.all([
      Network.enable(),
      Page.enable(),
    ]);

    await Promise.all(this._behaviors.map(behavior => behavior.initialize()));
    await Network.setExtraHTTPHeaders({ headers });
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
      if (!this.killed) {
        await Page.screencastFrameAck({ sessionId });
      }
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

    return await screenshotStitcher(outputClip, this._zoom, this._maxScreenshotDimension, async screenshotClip => {
      const { data } = await Page.captureScreenshot({
        clip: {
          ...screenshotClip,
          scale: 1
        }
      });
      return data;
    });
  }

  async _writeData(writePath, base64EncodedData) {
    const buffer = Buffer.from(base64EncodedData, 'base64');
    await promisify(fs.writeFile, fs)(writePath, buffer);
  }

  async setViewport({ width, height, zoom }) {
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
    while (!this.killed && (await this.evaluate({ fn, args })) !== toEqual) {
      await delay(this._waitForDelayMs);
    }
  }

  async waitForSelector(selector) {
    while (!this.killed) {
      const { nodeId } = await this._client.DOM.querySelector({ nodeId: this.documentNode.root.nodeId, selector });
      if (nodeId) {
        break;
      }

      await delay(this._waitForDelayMs);
    }
  }
}
