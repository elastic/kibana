/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { interval, throwError, of } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Logger } from 'src/core/server';
import { createMockBrowserDriver } from '../browsers/mock';
import { createMockLayout } from '../layouts/mock';
import { ScreenshotObservableHandler, ScreenshotObservableOptions } from './observable';

describe('ScreenshotObservableHandler', () => {
  let browser: ReturnType<typeof createMockBrowserDriver>;
  let layout: ReturnType<typeof createMockLayout>;
  let logger: jest.Mocked<Logger>;
  let options: ScreenshotObservableOptions;

  beforeEach(async () => {
    browser = createMockBrowserDriver();
    layout = createMockLayout();
    logger = { error: jest.fn() } as unknown as jest.Mocked<Logger>;
    options = {
      headers: { testHeader: 'testHeadValue' },
      timeouts: {
        loadDelay: 5000,
        openUrl: 30000,
        waitForElements: 30000,
        renderComplete: 30000,
      },
      urls: [],
    };

    browser.isPageOpen.mockReturnValue(true);
  });

  describe('waitUntil', () => {
    it('catches TimeoutError and references the timeout config in a custom message', async () => {
      const screenshots = new ScreenshotObservableHandler(browser, logger, layout, options);
      const test$ = interval(1000).pipe(screenshots.waitUntil(200, 'Test Config'));

      const testPipeline = () => test$.toPromise();
      await expect(testPipeline).rejects.toMatchInlineSnapshot(
        `[Error: The "Test Config" phase took longer than 0.2 seconds.]`
      );
    });

    it('catches other Errors and explains where they were thrown', async () => {
      const screenshots = new ScreenshotObservableHandler(browser, logger, layout, options);
      const test$ = throwError(new Error(`Test Error to Throw`)).pipe(
        screenshots.waitUntil(200, 'Test Config')
      );

      const testPipeline = () => test$.toPromise();
      await expect(testPipeline).rejects.toMatchInlineSnapshot(
        `[Error: The "Test Config" phase encountered an error: Error: Test Error to Throw]`
      );
    });

    it('is a pass-through if there is no Error', async () => {
      const screenshots = new ScreenshotObservableHandler(browser, logger, layout, options);
      const test$ = of('nice to see you').pipe(screenshots.waitUntil(20, 'xxxxxxxxxxx'));

      await expect(test$.toPromise()).resolves.toBe(`nice to see you`);
    });
  });

  describe('checkPageIsOpen', () => {
    it('throws a decorated Error when page is not open', async () => {
      browser.isPageOpen.mockReturnValue(false);
      const screenshots = new ScreenshotObservableHandler(browser, logger, layout, options);
      const test$ = of(234455).pipe(
        map((input) => {
          screenshots.checkPageIsOpen();
          return input;
        })
      );

      await expect(test$.toPromise()).rejects.toMatchInlineSnapshot(
        `[Error: Browser was closed unexpectedly! Check the server logs for more info.]`
      );
    });

    it('is a pass-through when the page is open', async () => {
      const screenshots = new ScreenshotObservableHandler(browser, logger, layout, options);
      const test$ = of(234455).pipe(
        map((input) => {
          screenshots.checkPageIsOpen();
          return input;
        })
      );

      await expect(test$.toPromise()).resolves.toBe(234455);
    });
  });
});
