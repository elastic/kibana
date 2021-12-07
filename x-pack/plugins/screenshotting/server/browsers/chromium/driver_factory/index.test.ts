/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import puppeteer from 'puppeteer';
import * as Rx from 'rxjs';
import { take } from 'rxjs/operators';
import type { Logger } from 'src/core/server';
import type { ScreenshotModePluginSetup } from 'src/plugins/screenshot_mode/server';
import { ConfigType } from '../../../config';
import { HeadlessChromiumDriverFactory } from '.';

jest.mock('puppeteer');

describe('HeadlessChromiumDriverFactory', () => {
  const path = 'path/to/headless_shell';
  const config = {
    browser: {
      chromium: {
        proxy: {},
      },
    },
  } as ConfigType;
  let logger: jest.Mocked<Logger>;
  let screenshotMode: jest.Mocked<ScreenshotModePluginSetup>;
  let factory: HeadlessChromiumDriverFactory;

  beforeEach(async () => {
    logger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      get: jest.fn(() => logger),
    } as unknown as typeof logger;
    screenshotMode = {} as unknown as typeof screenshotMode;

    (puppeteer as jest.Mocked<typeof puppeteer>).launch.mockResolvedValue({
      newPage: jest.fn().mockResolvedValue({
        target: jest.fn(() => ({
          createCDPSession: jest.fn().mockResolvedValue({
            send: jest.fn(),
          }),
        })),
        emulateTimezone: jest.fn(),
        setDefaultTimeout: jest.fn(),
      }),
      close: jest.fn(),
      process: jest.fn(),
    } as unknown as puppeteer.Browser);

    factory = new HeadlessChromiumDriverFactory(screenshotMode, config, logger, path);
    jest.spyOn(factory, 'getBrowserLogger').mockReturnValue(Rx.EMPTY);
    jest.spyOn(factory, 'getProcessLogger').mockReturnValue(Rx.EMPTY);
    jest.spyOn(factory, 'getPageExit').mockReturnValue(Rx.EMPTY);
  });

  describe('createPage', () => {
    it('returns browser driver and process exit observable', async () => {
      await expect(
        factory.createPage({ openUrlTimeout: 0 }).pipe(take(1)).toPromise()
      ).resolves.toEqual(
        expect.objectContaining({
          driver: expect.anything(),
          exit$: expect.anything(),
        })
      );
    });

    it('rejects if Puppeteer launch fails', async () => {
      (puppeteer as jest.Mocked<typeof puppeteer>).launch.mockRejectedValue(
        `Puppeteer Launch mock fail.`
      );
      expect(() =>
        factory.createPage({ openUrlTimeout: 0 }).pipe(take(1)).toPromise()
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Error spawning Chromium browser! Puppeteer Launch mock fail."`
      );
    });
  });
});
