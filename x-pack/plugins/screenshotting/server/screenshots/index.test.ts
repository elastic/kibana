/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, PackageInfo } from '@kbn/core/server';
import { httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { lastValueFrom, of, throwError } from 'rxjs';
import { ScreenshotOptions, Screenshots } from '.';
import {
  SCREENSHOTTING_APP_ID,
  SCREENSHOTTING_EXPRESSION,
  SCREENSHOTTING_EXPRESSION_INPUT,
} from '../../common';
import type { HeadlessChromiumDriverFactory } from '../browsers';
import { createMockBrowserDriver, createMockBrowserDriverFactory } from '../browsers/mock';
import type { ConfigType } from '../config';
import type { PngScreenshotOptions } from '../formats';
import * as Layouts from '../layouts/create_layout';
import { createMockLayout } from '../layouts/mock';
import { CONTEXT_ELEMENTATTRIBUTES } from './constants';

/*
 * Tests
 */
describe('Screenshot Observable Pipeline', () => {
  let driver: ReturnType<typeof createMockBrowserDriver>;
  let driverFactory: jest.Mocked<HeadlessChromiumDriverFactory>;
  let http: ReturnType<typeof httpServiceMock.createSetupContract>;
  let layout: ReturnType<typeof createMockLayout>;
  let logger: jest.Mocked<Logger>;
  let packageInfo: Readonly<PackageInfo>;
  let options: ScreenshotOptions;
  let screenshots: Screenshots;
  let config: ConfigType;

  beforeEach(async () => {
    driver = createMockBrowserDriver();
    driverFactory = createMockBrowserDriverFactory(driver);
    http = httpServiceMock.createSetupContract();
    layout = createMockLayout();
    logger = loggingSystemMock.createLogger();

    packageInfo = {
      branch: 'screenshot-test',
      buildNum: 567891011,
      buildSha: 'screenshot-dfdfed0a',
      dist: false,
      version: '5000.0.0',
    };
    options = {
      browserTimezone: 'UTC',
      headers: {},
      layout: {},
      urls: ['/welcome/home/start/index.htm'],
    };
    config = {
      poolSize: 1,
      capture: {
        timeouts: {
          openUrl: 30000,
          waitForElements: 30000,
          renderComplete: 30000,
        },
        loadDelay: 5000000000,
        zoom: 2,
      },
      networkPolicy: { enabled: false, rules: [] },
      browser: {} as ConfigType['browser'],
    };

    screenshots = new Screenshots(driverFactory, logger, packageInfo, http, config);

    jest.spyOn(Layouts, 'createLayout').mockReturnValue(layout);

    driver.isPageOpen.mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('pipelines a single url into screenshot and timeRange', async () => {
    const result = await lastValueFrom(screenshots.getScreenshots(options as PngScreenshotOptions));

    expect(result).toHaveProperty('results');
    expect(result.results).toMatchSnapshot();
  });

  it('pipelines multiple urls into', async () => {
    driver.screenshot.mockResolvedValue(Buffer.from('some screenshots'));
    const result = await lastValueFrom(
      screenshots.getScreenshots({
        ...options,
        urls: ['/welcome/home/start/index2.htm', '/welcome/home/start/index.php3?page=./home.php'],
      } as PngScreenshotOptions)
    );

    expect(result).toHaveProperty('results');
    expect(result.results).toMatchSnapshot();

    expect(driver.open).toHaveBeenCalledTimes(2);
    expect(driver.open).nthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({ waitForSelector: '.kbnAppWrapper' }),
      expect.anything()
    );
    expect(driver.open).nthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({ waitForSelector: '[data-shared-page="2"]' }),
      expect.anything()
    );
  });

  it('captures screenshot of an expression', async () => {
    await screenshots
      .getScreenshots({
        ...options,
        expression: 'kibana',
        input: 'something',
      } as PngScreenshotOptions)
      .toPromise();

    expect(driver.open).toHaveBeenCalledTimes(1);
    expect(driver.open).toHaveBeenCalledWith(
      expect.stringContaining(SCREENSHOTTING_APP_ID),
      expect.objectContaining({
        context: expect.objectContaining({
          [SCREENSHOTTING_EXPRESSION]: 'kibana',
          [SCREENSHOTTING_EXPRESSION_INPUT]: 'something',
        }),
      }),
      expect.anything()
    );
  });

  describe('error handling', () => {
    it('recovers if waitForSelector fails', async () => {
      driver.waitForSelector.mockImplementation((selectorArg: string) => {
        throw new Error('Mock error!');
      });
      const result = await lastValueFrom(
        screenshots.getScreenshots({
          ...options,
          urls: [
            '/welcome/home/start/index2.htm',
            '/welcome/home/start/index.php3?page=./home.php3',
          ],
        } as PngScreenshotOptions)
      );

      expect(result).toHaveProperty('results');
      expect(result.results).toMatchSnapshot();
    });

    it('observes page exit', async () => {
      driverFactory.createPage.mockReturnValue(
        of({
          driver,
          unexpectedExit$: throwError('Instant timeout has fired!'),
          close: () => of({}),
        })
      );

      await expect(screenshots.getScreenshots(options).toPromise()).rejects.toMatchInlineSnapshot(
        `"Instant timeout has fired!"`
      );
    });

    it(`uses defaults for element positions and size when Kibana page is not ready`, async () => {
      driver.evaluate.mockImplementation(async (_, { context }) =>
        context === CONTEXT_ELEMENTATTRIBUTES ? null : undefined
      );

      layout.getViewport = () => null;
      const result = await lastValueFrom(
        screenshots.getScreenshots(options as PngScreenshotOptions)
      );

      expect(result).toHaveProperty('results');
      expect(result.results).toMatchSnapshot();
    });
  });
});
