/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Chrome from 'devtools-protocol';
import fs from 'fs';
import moment from 'moment';
import path from 'path';
import util from 'util';
import { ElementPosition, Logger } from '../../../../types';
import { ignoreSSLErrorsBehavior } from './ignore_ssl_errors';
import { screenshotStitcher } from './screenshot_stitcher';
import { transformFn } from './transform_fn';

const WAIT_FOR_DELAY_MS: number = 100;

export class HeadlessChromiumDriver {
  private client: Chrome.Protocol.ProtocolApi;
  private maxScreenshotDimension: number;
  private zoom: number = 1;
  private logger: Logger;
  private killed: boolean = false;
  private documentNode?: Chrome.Protocol.DOM.GetDocumentResponse;

  constructor(
    client: Chrome.Protocol.ProtocolApi,
    options: { maxScreenshotDimension: number; logger: Logger }
  ) {
    this.client = client;
    this.maxScreenshotDimension = options.maxScreenshotDimension;
    this.logger = options.logger;
  }

  public async evaluate<T>({
    fn,
    args = [],
    awaitPromise = false,
    returnByValue = false,
  }: {
    fn: () => T;
    args: Array<string | object>;
    awaitPromise?: boolean;
    returnByValue?: boolean;
  }) {
    const { Runtime } = this.client;

    const serializedArgs = args.map(arg => JSON.stringify(arg)).join(',');
    const expression = `(${transformFn(fn)})(${serializedArgs})`;
    const result = await Runtime.evaluate({
      awaitPromise,
      expression,
      returnByValue,
    });
    return result.result.value;
  }

  public async open(
    url: string,
    { headers, waitForSelector }: { headers: { [key: string]: string }; waitForSelector: string }
  ) {
    this.logger.debug(`HeadlessChromiumDriver:opening url ${url}`);
    const { Network, Page } = this.client;
    await Promise.all([Network.enable({}), Page.enable()]);

    await ignoreSSLErrorsBehavior(this.client.Security);
    await Network.setExtraHTTPHeaders({ headers });
    await Page.navigate({ url });

    // See https://github.com/ChromeDevTools/devtools-protocol/issues/104 - this should be valid
    // usage but is not accepted by the type library.
    await (Page as any).loadEventFired();

    const { frameTree } = await Page.getResourceTree();
    if (frameTree.frame.unreachableUrl) {
      throw new Error('URL open failed. Is the server running?');
    }
    this.documentNode = await this.client.DOM.getDocument({});
    await this.waitForSelector(waitForSelector);
  }

  /**
   *
   * @param recordPath The file path where the record should be stored
   */
  public async record(recordPath: string) {
    const { Page } = this.client;

    await util.promisify(fs.mkdir)(recordPath);
    await Page.startScreencast({});

    Page.on('screencastFrame', async ({ data, sessionId }) => {
      await this._writeData(
        path.join(
          recordPath,
          `${moment()
            .utc()
            .format('HH_mm_ss_SSS')}.png`
        ),
        data
      );
      if (!this.killed) {
        await Page.screencastFrameAck({ sessionId });
      }
    });
  }

  public async screenshot(elementPosition: ElementPosition | null = null) {
    const { Page } = this.client;

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

    return await screenshotStitcher(
      outputClip,
      this.zoom,
      this.maxScreenshotDimension,
      async screenshotClip => {
        const { data } = await Page.captureScreenshot({
          clip: {
            ...screenshotClip,
            scale: 1,
          },
        });
        this.logger.debug(`Captured screenshot clip ${JSON.stringify(screenshotClip)}`);
        return data;
      },
      this.logger
    );
  }

  public async _writeData(writePath: string, base64EncodedData: string) {
    const buffer = Buffer.from(base64EncodedData, 'base64');
    await util.promisify(fs.writeFile)(writePath, buffer);
  }

  public async setViewport({
    width,
    height,
    zoom,
  }: {
    width: number;
    height: number;
    zoom: number;
  }) {
    this.logger.debug(`Setting viewport to width: ${width}, height: ${height}, zoom: ${zoom}`);
    const { Emulation } = this.client;

    await Emulation.setDeviceMetricsOverride({
      width: Math.floor(width / zoom),
      height: Math.floor(height / zoom),
      deviceScaleFactor: zoom,
      mobile: false,
    });

    this.zoom = zoom;
  }

  public async waitFor<T>({
    fn,
    args,
    toEqual,
  }: {
    fn: () => T;
    args: Array<string | object>;
    toEqual: T;
  }) {
    while (!this.killed && (await this.evaluate<T>({ fn, args })) !== toEqual) {
      await new Promise(resolve => setTimeout(resolve, WAIT_FOR_DELAY_MS));
    }
  }

  public async waitForSelector(selector: string) {
    if (!this.documentNode) {
      throw new Error('Document object is not defined');
    }
    while (!this.killed) {
      const { nodeId } = await this.client.DOM.querySelector({
        nodeId: this.documentNode.root.nodeId,
        selector,
      });
      if (nodeId) {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, WAIT_FOR_DELAY_MS));
    }
  }
}
