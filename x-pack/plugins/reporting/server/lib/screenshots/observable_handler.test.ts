/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import { first, map } from 'rxjs/operators';
import { HeadlessChromiumDriver } from '../../browsers';
import { ReportingConfigType } from '../../config';
import { ConditionalHeaders } from '../../export_types/common';
import {
  createMockBrowserDriverFactory,
  createMockConfigSchema,
  createMockLayoutInstance,
  createMockLevelLogger,
  createMockReportingCore,
} from '../../test_helpers';
import { LayoutInstance } from '../layouts';
import { PhaseTimeouts, ScreenshotObservableOpts } from './';
import { ScreenshotObservableHandler } from './observable_handler';

const logger = createMockLevelLogger();

describe('ScreenshotObservableHandler', () => {
  let captureConfig: ReportingConfigType['capture'];
  let layout: LayoutInstance;
  let conditionalHeaders: ConditionalHeaders;
  let opts: ScreenshotObservableOpts;
  let timeouts: PhaseTimeouts;
  let driver: HeadlessChromiumDriver;

  beforeAll(async () => {
    captureConfig = {
      timeouts: {
        openUrl: 30000,
        waitForElements: 30000,
        renderComplete: 30000,
      },
      loadDelay: 5000,
    } as unknown as typeof captureConfig;

    layout = createMockLayoutInstance(captureConfig);

    conditionalHeaders = {
      headers: { testHeader: 'testHeadValue' },
      conditions: {} as unknown as ConditionalHeaders['conditions'],
    };

    opts = {
      conditionalHeaders,
      layout,
      logger,
      urlsOrUrlLocatorTuples: [],
    };

    timeouts = {
      openUrl: {
        timeoutValue: 60000,
        configValue: `xpack.reporting.capture.timeouts.openUrl`,
        label: 'open URL',
      },
      waitForElements: {
        timeoutValue: 30000,
        configValue: `xpack.reporting.capture.timeouts.waitForElements`,
        label: 'wait for elements',
      },
      renderComplete: {
        timeoutValue: 60000,
        configValue: `xpack.reporting.capture.timeouts.renderComplete`,
        label: 'render complete',
      },
      loadDelay: 5000,
    };
  });

  beforeEach(async () => {
    const reporting = await createMockReportingCore(createMockConfigSchema());
    const driverFactory = await createMockBrowserDriverFactory(reporting, logger);
    ({ driver } = await driverFactory.createPage({}, logger).pipe(first()).toPromise());
    driver.isPageOpen = jest.fn().mockImplementation(() => true);
  });

  describe('waitUntil', () => {
    it('catches TimeoutError and references the timeout config in a custom message', async () => {
      const screenshots = new ScreenshotObservableHandler(driver, opts, timeouts);
      const test$ = Rx.interval(1000).pipe(
        screenshots.waitUntil({
          timeoutValue: 200,
          configValue: 'test.config.value',
          label: 'Test Config',
        })
      );

      const testPipeline = () => test$.toPromise();
      await expect(testPipeline).rejects.toMatchInlineSnapshot(
        `[Error: The "Test Config" phase took longer than 0.2 seconds. You may need to increase "test.config.value": TimeoutError: Timeout has occurred]`
      );
    });

    it('catches other Errors and explains where they were thrown', async () => {
      const screenshots = new ScreenshotObservableHandler(driver, opts, timeouts);
      const test$ = Rx.throwError(new Error(`Test Error to Throw`)).pipe(
        screenshots.waitUntil({
          timeoutValue: 200,
          configValue: 'test.config.value',
          label: 'Test Config',
        })
      );

      const testPipeline = () => test$.toPromise();
      await expect(testPipeline).rejects.toMatchInlineSnapshot(
        `[Error: The "Test Config" phase encountered an error: Error: Test Error to Throw]`
      );
    });

    it('is a pass-through if there is no Error', async () => {
      const screenshots = new ScreenshotObservableHandler(driver, opts, timeouts);
      const test$ = Rx.of('nice to see you').pipe(
        screenshots.waitUntil({
          timeoutValue: 20,
          configValue: 'xxxxxxxxxxxxxxxxx',
          label: 'xxxxxxxxxxx',
        })
      );

      await expect(test$.toPromise()).resolves.toBe(`nice to see you`);
    });
  });

  describe('checkPageIsOpen', () => {
    it('throws a decorated Error when page is not open', async () => {
      driver.isPageOpen = jest.fn().mockImplementation(() => false);
      const screenshots = new ScreenshotObservableHandler(driver, opts, timeouts);
      const test$ = Rx.of(234455).pipe(
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
      const screenshots = new ScreenshotObservableHandler(driver, opts, timeouts);
      const test$ = Rx.of(234455).pipe(
        map((input) => {
          screenshots.checkPageIsOpen();
          return input;
        })
      );

      await expect(test$.toPromise()).resolves.toBe(234455);
    });
  });
});
