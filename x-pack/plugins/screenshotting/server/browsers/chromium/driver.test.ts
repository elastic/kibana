/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/server';
import * as puppeteer from 'puppeteer';
import { Size } from '../../../common/layout';
import { ConfigType } from '../../config';
import { PreserveLayout } from '../../layouts/preserve_layout';
import { HeadlessChromiumDriver } from './driver';

describe('chromium driver', () => {
  let mockConfig: ConfigType;
  let mockLogger: Logger;
  let mockScreenshotModeSetup: ScreenshotModePluginSetup;
  let mockPage: puppeteer.Page;

  const mockBasePath = '/kibanaTest1';

  beforeEach(() => {
    mockLogger = { debug: jest.fn(), error: jest.fn(), info: jest.fn() } as unknown as Logger;
    mockLogger.get = () => mockLogger;

    mockConfig = {
      enabled: true,
      networkPolicy: {
        enabled: false,
        rules: [],
      },
      browser: {
        autoDownload: false,
        chromium: { proxy: { enabled: false } },
      },
      capture: {
        timeouts: {
          openUrl: 60000,
          waitForElements: 60000,
          renderComplete: 60000,
        },
        zoom: 2,
      },
      poolSize: 1,
    };

    mockPage = {
      screenshot: jest.fn().mockResolvedValue(`you won't believe this one weird screenshot`),
      evaluate: jest.fn(),
    } as unknown as puppeteer.Page;

    mockScreenshotModeSetup = {
      setScreenshotContext: jest.fn(),
      setScreenshotModeEnabled: jest.fn(),
      isScreenshotMode: jest.fn(),
    };
  });

  it('return screenshot with preserve layout option', async () => {
    const driver = new HeadlessChromiumDriver(
      mockScreenshotModeSetup,
      mockConfig,
      mockBasePath,
      mockPage
    );

    const result = await driver.screenshot({
      elementPosition: {
        boundingClientRect: { top: 200, left: 10, height: 10, width: 100 },
        scroll: { x: 100, y: 300 },
      },
      layout: new PreserveLayout({ width: 16, height: 16 }),
    });

    expect(result).toEqual(Buffer.from(`you won't believe this one weird screenshot`, 'base64'));
  });

  it('add error to screenshot contents', async () => {
    const driver = new HeadlessChromiumDriver(
      mockScreenshotModeSetup,
      mockConfig,
      mockBasePath,
      mockPage
    );

    // @ts-expect-error spy on non-public class method
    const testSpy = jest.spyOn(driver, 'injectScreenshottingErrorHeader');

    const result = await driver.screenshot({
      elementPosition: {
        boundingClientRect: { top: 200, left: 10, height: 10, width: 100 },
        scroll: { x: 100, y: 300 },
      },
      layout: new PreserveLayout({} as Size),
      error: new Error(`Here's the fake error!`),
    });

    expect(testSpy.mock.lastCall).toMatchInlineSnapshot(`
      Array [
        [Error: Here's the fake error!],
        "[data-shared-items-container]",
      ]
    `);
    expect(result).toEqual(Buffer.from(`you won't believe this one weird screenshot`, 'base64'));
  });
});
