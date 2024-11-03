/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { HttpServiceSetup } from '@kbn/core-http-server';
import type { PackageInfo } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { loggerMock } from '@kbn/logging-mocks';
import type { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/server';
import type { ConfigType } from '@kbn/screenshotting-server';
import puppeteer from 'puppeteer';
import * as Rx from 'rxjs';
import { firstValueFrom } from 'rxjs';
import type { PngScreenshotOptions } from '..';
import { HeadlessChromiumDriverFactory } from '../browsers';
import { Screenshots } from './screenshots';

jest.mock('puppeteer');

describe('class Screenshots', () => {
  let mockConfig: ConfigType;
  let browserDriverFactory: HeadlessChromiumDriverFactory;
  let mockPackageInfo: PackageInfo;
  let mockHttpSetup: HttpServiceSetup;
  let mockCloudSetup: CloudSetup;
  let mockLogger: Logger;
  let mockScreenshotModeSetup: ScreenshotModePluginSetup;

  const mockBinaryPath = '/kibana/x-pack/plugins/screenshotting/chromium/linux/headless_shell';
  const mockBasePath = '/kibanaTest1';

  beforeEach(() => {
    mockLogger = loggerMock.create();

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

    mockScreenshotModeSetup = {} as unknown as ScreenshotModePluginSetup;

    browserDriverFactory = new HeadlessChromiumDriverFactory(
      mockScreenshotModeSetup,
      mockConfig,
      mockLogger,
      mockBinaryPath,
      mockBasePath
    );

    mockCloudSetup = { isCloudEnabled: true, instanceSizeMb: 8000 } as unknown as CloudSetup;
  });

  const getScreenshotsInstance = () =>
    new Screenshots(
      browserDriverFactory,
      mockLogger,
      mockPackageInfo,
      mockHttpSetup,
      mockConfig,
      mockCloudSetup
    );

  it('detects sufficient memory from cloud plugin', () => {
    const screenshotsInstance = getScreenshotsInstance();
    const hasInsufficient = screenshotsInstance.systemHasInsufficientMemory();
    expect(hasInsufficient).toBe(false);
  });

  it('detects insufficient memory from cloud plugin', () => {
    mockCloudSetup = { isCloudEnabled: true, instanceSizeMb: 1000 } as unknown as CloudSetup;
    const screenshotsInstance = getScreenshotsInstance();
    const hasInsufficient = screenshotsInstance.systemHasInsufficientMemory();
    expect(hasInsufficient).toBe(true);
  });

  it('ignores insufficient memory if cloud is not enabled', () => {
    mockCloudSetup = { isCloudEnabled: false, instanceSizeMb: 1000 } as unknown as CloudSetup;
    const screenshotsInstance = getScreenshotsInstance();
    const hasInsufficient = screenshotsInstance.systemHasInsufficientMemory();
    expect(hasInsufficient).toBe(false);
  });

  describe('getScreenshots', () => {
    beforeAll(() => {
      jest.mock('puppeteer'); // see __mocks__/puppeteer.ts
    });

    beforeEach(() => {
      jest.spyOn(browserDriverFactory, 'getBrowserLogger').mockReturnValue(Rx.EMPTY);
      jest.spyOn(browserDriverFactory, 'getProcessLogger').mockReturnValue(Rx.EMPTY);
      jest.spyOn(browserDriverFactory, 'getPageExit').mockReturnValue(Rx.EMPTY);
    });

    it('getScreenshots with PngScreenshotOptions', async () => {
      const screenshotsInstance = getScreenshotsInstance();

      const options: PngScreenshotOptions = {
        format: 'png',
        layout: { id: 'preserve_layout' },
        urls: ['/app/home/test'],
        taskInstanceFields: { startedAt: null, retryAt: null },
      };

      const observe = screenshotsInstance.getScreenshots(options);
      await firstValueFrom(observe).then((captureResult) => {
        expect(captureResult.results[0].screenshots[0].data).toEqual(
          Buffer.from(`you won't believe this one weird screenshot`, 'base64')
        );
        expect(captureResult.results[0].renderErrors).toBe(undefined);
        expect(captureResult.results[0].error).toBe(undefined);
      });
    });

    it('adds warning to the screenshot in case of openUrl timeout', async () => {
      // @ts-expect-error should not assign new value to read-only property
      mockConfig.capture.timeouts.openUrl = 10; // must be a small amount of milliseconds

      // mock override
      const browser = await puppeteer.launch();
      const page = await browser.newPage(); // should be stubPage
      const pageGotoSpy = jest.spyOn(page, 'goto');
      pageGotoSpy.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(resolve, 100); // must be larger than 10
          })
      );

      const screenshotsInstance = getScreenshotsInstance();

      const options: PngScreenshotOptions = {
        format: 'png',
        layout: { id: 'preserve_layout' },
        urls: ['/app/home/test'],
        taskInstanceFields: { startedAt: null, retryAt: null },
      };

      const observe = screenshotsInstance.getScreenshots(options);
      await firstValueFrom(observe).then((captureResult) => {
        expect(captureResult.results[0].error).toEqual(
          new Error(
            `Screenshotting encountered a timeout error: "open URL" took longer than 0.01 seconds.` +
              ` You may need to increase "xpack.screenshotting.capture.timeouts.openUrl" in kibana.yml.`
          )
        );
      });
    });
  });
});
