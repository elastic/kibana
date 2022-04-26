/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import puppeteer from 'puppeteer';
import * as Rx from 'rxjs';
import { mergeMap, take } from 'rxjs/operators';
import type { Logger } from '@kbn/core/server';
import type { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/server';
import { ConfigType } from '../../../config';
import { HeadlessChromiumDriverFactory, DEFAULT_VIEWPORT } from '.';

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
  let mockBrowser: jest.Mocked<puppeteer.Browser>;

  beforeEach(async () => {
    logger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      get: jest.fn(() => logger),
    } as unknown as typeof logger;
    screenshotMode = {} as unknown as typeof screenshotMode;

    let pageClosed = false;
    mockBrowser = {
      newPage: jest.fn().mockResolvedValue({
        target: jest.fn(() => ({
          createCDPSession: jest.fn().mockResolvedValue({
            send: jest.fn(),
          }),
        })),
        emulateTimezone: jest.fn(),
        setDefaultTimeout: jest.fn(),
        isClosed: jest.fn(() => {
          return pageClosed;
        }),
      }),
      close: jest.fn(() => {
        pageClosed = true;
      }),
      process: jest.fn(),
    } as unknown as jest.Mocked<puppeteer.Browser>;

    (puppeteer as jest.Mocked<typeof puppeteer>).launch.mockResolvedValue(mockBrowser);

    factory = new HeadlessChromiumDriverFactory(screenshotMode, config, logger, path, '');
    jest.spyOn(factory, 'getBrowserLogger').mockReturnValue(Rx.EMPTY);
    jest.spyOn(factory, 'getProcessLogger').mockReturnValue(Rx.EMPTY);
    jest.spyOn(factory, 'getPageExit').mockReturnValue(Rx.EMPTY);
  });

  describe('createPage', () => {
    it('returns browser driver, unexpected process exit observable, and close callback', async () => {
      await expect(
        factory
          .createPage({ openUrlTimeout: 0, defaultViewport: DEFAULT_VIEWPORT })
          .pipe(take(1))
          .toPromise()
      ).resolves.toEqual(
        expect.objectContaining({
          driver: expect.anything(),
          unexpectedExit$: expect.anything(),
          close: expect.anything(),
        })
      );
    });

    it('rejects if Puppeteer launch fails', async () => {
      (puppeteer as jest.Mocked<typeof puppeteer>).launch.mockRejectedValue(
        `Puppeteer Launch mock fail.`
      );
      expect(() =>
        factory
          .createPage({ openUrlTimeout: 0, defaultViewport: DEFAULT_VIEWPORT })
          .pipe(take(1))
          .toPromise()
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Error spawning Chromium browser! Puppeteer Launch mock fail."`
      );
    });

    describe('close behaviour', () => {
      it('does not allow close to be called on the browse more than once', async () => {
        await factory
          .createPage({ openUrlTimeout: 0, defaultViewport: DEFAULT_VIEWPORT })
          .pipe(
            take(1),
            mergeMap(async ({ close }) => {
              expect(mockBrowser.close).not.toHaveBeenCalled();
              await close().toPromise();
              await close().toPromise();
              expect(mockBrowser.close).toHaveBeenCalledTimes(1);
            })
          )
          .toPromise();
        // Check again, after the observable completes
        expect(mockBrowser.close).toHaveBeenCalledTimes(1);
      });
    });
  });
});
