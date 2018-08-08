/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class HeadlessChromiumDriver {
  constructor(client, page, { maxScreenshotDimension, logger }) {
    this._client = client;
    this._page = page;
    this._maxScreenshotDimension = maxScreenshotDimension;
    this._waitForDelayMs = 100;
    this._zoom = 1;
    this._logger = logger;
  }

  async open(url, { headers, waitForSelector }) {
    this._logger.debug(`HeadlessChromiumDriver:opening url ${url}`);

    // await ignoreSSLErrorsBehavior(this._client.Security);
    await this._page.setExtraHTTPHeaders(headers);
    await this._page.goto(url, { waitUntil: 'networkidle0' });

    this.documentNode = await this._page.evaluateHandle(() => document);
    await this._page.waitFor(waitForSelector);
  }

  async screenshot(elementPosition = null) {
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

    return await this._page.screenshot({
      clip,
    });
  }

  async setViewport({ width, height, zoom }) {
    this._logger.debug(`Setting viewport to width: ${width}, height: ${height}, zoom: ${zoom}`);

    await this._page.setViewport({
      width: Math.floor(width / zoom),
      height: Math.floor(height / zoom),
      deviceScaleFactor: zoom,
      isMobile: false,
    });

    this._zoom = zoom;
  }
}
