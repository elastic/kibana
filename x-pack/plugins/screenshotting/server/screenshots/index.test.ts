/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { Logger, PackageInfo } from '@kbn/core/server';
import { httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { ConfigType } from '@kbn/screenshotting-server';
import { lastValueFrom, of, throwError } from 'rxjs';
import { ScreenshotOptions, Screenshots } from '.';
import {
  SCREENSHOTTING_APP_ID,
  SCREENSHOTTING_EXPRESSION,
  SCREENSHOTTING_EXPRESSION_INPUT,
} from '../../common';
import * as errors from '../../common/errors';
import type { HeadlessChromiumDriverFactory } from '../browsers';
import { createMockBrowserDriver, createMockBrowserDriverFactory } from '../browsers/mock';
import type { PngScreenshotOptions } from '../formats';
import * as Layouts from '../layouts/create_layout';
import { createMockLayout } from '../layouts/mock';
import { CONTEXT_ELEMENTATTRIBUTES } from './constants';

/*
 * Tests
 */
describe('Screenshot Observable Pipeline', () => {
  const originalCreateLayout = Layouts.createLayout;
  let driver: ReturnType<typeof createMockBrowserDriver>;
  let driverFactory: jest.Mocked<HeadlessChromiumDriverFactory>;
  let http: ReturnType<typeof httpServiceMock.createSetupContract>;
  let layout: ReturnType<typeof createMockLayout>;
  let logger: jest.Mocked<Logger>;
  let packageInfo: Readonly<PackageInfo>;
  let options: ScreenshotOptions;
  let screenshots: Screenshots;
  let cloud: CloudSetup;
  let config: ConfigType;

  beforeEach(async () => {
    cloud = {
      isCloudEnabled: false,
      instanceSizeMb: 1024, // 1GB
      apm: {},
    } as CloudSetup;
    driver = createMockBrowserDriver();
    driverFactory = createMockBrowserDriverFactory(driver);
    http = httpServiceMock.createSetupContract();
    layout = createMockLayout();
    logger = loggingSystemMock.createLogger();

    packageInfo = {
      branch: 'screenshot-test',
      buildNum: 567891011,
      buildSha: 'screenshot-dfdfed0a',
      buildShaShort: 'scrn-dfdfed0a',
      dist: false,
      version: '5000.0.0',
      buildDate: new Date('2023-05-15T23:12:09.000Z'),
      buildFlavor: 'traditional',
    };
    options = {
      browserTimezone: 'UTC',
      headers: {},
      layout: {},
      urls: ['/welcome/home/start/index.htm'],
      taskInstanceFields: { startedAt: null, retryAt: null },
    };
    config = {
      enabled: true,
      poolSize: 1,
      capture: {
        timeouts: {
          openUrl: 30000,
          waitForElements: 30000,
          renderComplete: 30000,
        },
        zoom: 2,
      },
      networkPolicy: { enabled: false, rules: [] },
      browser: {} as ConfigType['browser'],
    };

    screenshots = new Screenshots(driverFactory, logger, packageInfo, http, config, cloud);

    // Using this patch instead of using `jest.spyOn`. This way we avoid calling
    // `jest.restoraAllMocks()` which removes implementations from other mocks not
    // explicit in this test (like apm mock object)
    // @ts-expect-error
    Layouts.createLayout = () => layout;
    driver.isPageOpen.mockReturnValue(true);
  });

  afterEach(() => {
    // @ts-expect-error
    Layouts.createLayout = originalCreateLayout;
    jest.clearAllMocks();
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
    await lastValueFrom(
      screenshots.getScreenshots({
        ...options,
        expression: 'kibana',
        input: 'something',
      } as PngScreenshotOptions)
    );

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
      driver.waitForSelector.mockImplementation(() => {
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
          error$: throwError(() => 'Instant timeout has fired!'),
          close: () => of({}),
        })
      );

      await expect(
        lastValueFrom(screenshots.getScreenshots(options))
      ).rejects.toMatchInlineSnapshot(`"Instant timeout has fired!"`);
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

    it("initial page is create with layout's width and deviceScaleFactor", async () => {
      const result = await lastValueFrom(
        screenshots.getScreenshots(options as PngScreenshotOptions)
      );

      expect(driverFactory.createPage).toBeCalledWith(
        expect.objectContaining({
          defaultViewport: {
            width: layout.width,
            deviceScaleFactor: layout.getBrowserZoom(),
          },
        }), // config with layout
        expect.anything() // logger
      );

      expect(result).toHaveProperty('results');
    });
  });

  describe('cloud', () => {
    beforeEach(() => {
      cloud.isCloudEnabled = true;
    });

    it('throws an error when OS memory is under 1GB on cloud', async () => {
      await expect(
        lastValueFrom(
          screenshots.getScreenshots({
            ...options,
            expression: 'kibana',
            input: 'something',
          } as PngScreenshotOptions)
        )
      ).rejects.toEqual(new errors.InsufficientMemoryAvailableOnCloudError());

      expect(driver.open).toHaveBeenCalledTimes(0);
    });

    it('generates a report when OS memory is 2GB on cloud', async () => {
      cloud.instanceSizeMb = 2048;
      await lastValueFrom(
        screenshots.getScreenshots({
          ...options,
          expression: 'kibana',
          input: 'something',
        } as PngScreenshotOptions)
      );

      expect(driver.open).toHaveBeenCalledTimes(1);
    });
  });
});
