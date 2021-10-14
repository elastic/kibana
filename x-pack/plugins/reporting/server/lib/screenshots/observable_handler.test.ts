/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import { first } from 'rxjs/operators';
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
import { ScreenshotObservableOpts } from './';
import { ScreenshotObservableHandler } from './observable_handler';

const logger = createMockLevelLogger();

describe('ScreenshotObservableHandler', () => {
  let captureConfig: ReportingConfigType['capture'];
  let layout: LayoutInstance;
  let conditionalHeaders: ConditionalHeaders;
  let opts: ScreenshotObservableOpts;
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

    const reporting = await createMockReportingCore(createMockConfigSchema());
    const driverFactory = await createMockBrowserDriverFactory(reporting, logger);
    ({ driver } = await driverFactory.createPage({}, logger).pipe(first()).toPromise());

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
  });

  it('instantiates', () => {
    const screenshots = new ScreenshotObservableHandler(driver, captureConfig, opts);
    expect(screenshots).not.toEqual(null);
  });

  it('waitUntil catches TimeoutError and adds custom message', async () => {
    const screenshots = new ScreenshotObservableHandler(driver, captureConfig, opts);
    const test$ = Rx.interval(1000).pipe(
      screenshots.waitUntil(
        {
          timeoutValue: 200,
          configValue: 'test.config.value',
          label: 'Test Config',
        },
        (outer: Rx.Observable<unknown>) => {
          return outer.pipe();
        }
      )
    );

    const testPipeline = () => test$.toPromise();
    await expect(testPipeline).rejects.toMatchInlineSnapshot(
      `[Error: The "Test Config" phase took longer than 0.2 seconds. You may need to increase "test.config.value": TimeoutError: Timeout has occurred]`
    );
  });

  it('waitUntil does not add custom message if thrown error is not a TimeoutError', async () => {
    const screenshots = new ScreenshotObservableHandler(driver, captureConfig, opts);
    const test$ = Rx.throwError(new Error(`Test Error to Throw`)).pipe(
      screenshots.waitUntil(
        {
          timeoutValue: 200,
          configValue: 'test.config.value',
          label: 'Test Config',
        },
        (outer: Rx.Observable<unknown>) => {
          return outer.pipe();
        }
      )
    );

    const testPipeline = () => test$.toPromise();
    await expect(testPipeline).rejects.toMatchInlineSnapshot(
      `[Error: The "Test Config" phase encountered an error: Error: Test Error to Throw]`
    );
  });

  it('waitUntil is a pass-through if there is no error', async () => {
    const screenshots = new ScreenshotObservableHandler(driver, captureConfig, opts);
    const test$ = Rx.of('nice to see you').pipe(
      screenshots.waitUntil(
        {
          timeoutValue: 20,
          configValue: 'test.config.value',
          label: 'Test Config',
        },
        (outer: Rx.Observable<unknown>) => {
          return outer.pipe();
        }
      )
    );

    await expect(test$.toPromise()).resolves.toMatchInlineSnapshot(`"nice to see you"`);
  });

  // TODO: test ScreenshotObservableHandler.checkPageIsOpen
});
