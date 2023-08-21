/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CloudSetup } from '@kbn/cloud-plugin/server';
import { HttpServiceSetup } from '@kbn/core-http-server';
import { PackageInfo } from '@kbn/core/server';
import expect from '@kbn/expect';
import type { Logger } from '@kbn/logging';
import { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/server';
import puppeteer from 'puppeteer';
import * as Rx from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { PngScreenshotOptions } from '..';
import { HeadlessChromiumDriverFactory } from '../browsers';
import { ConfigType } from '../config';
import { Screenshots } from './screenshots';

jest.mock('puppeteer', () => {
  const stubDevTools = {
    send: jest.fn(),
  };
  const stubTarget = {
    createCDPSession: () => {
      return stubDevTools;
    },
  };
  const stubPage = {
    target: () => {
      return stubTarget;
    },
    emulateTimezone: jest.fn(),
    setDefaultTimeout: jest.fn(),
    isClosed: jest.fn(),
    setViewport: jest.fn(),
    evaluate: jest.fn(),
    screenshot: jest.fn().mockResolvedValue(`you won't believe this one weird screenshot`),
    evaluateOnNewDocument: jest.fn(),
    setRequestInterception: jest.fn(),
    _client: jest.fn(() => ({ on: jest.fn() })),
    on: jest.fn(),
    goto: jest.fn(),
    waitForSelector: jest.fn().mockResolvedValue(true),
    waitForFunction: jest.fn(),
  };
  const stubBrowser = {
    newPage: () => {
      return stubPage;
    },
  };
  return {
    launch: () => {
      return stubBrowser;
    },
  };
});

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
    mockLogger = { debug: jest.fn(), error: jest.fn(), info: jest.fn() } as unknown as Logger;
    mockLogger.get = () => mockLogger;

    mockConfig = {
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

    mockScreenshotModeSetup = {
      setScreenshotContext: jest.fn(),
      setScreenshotModeEnabled: jest.fn(),
      isScreenshotMode: jest.fn(),
    };

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
    expect(hasInsufficient).to.be(false);
  });

  it('detects insufficient memory from cloud plugin', () => {
    mockCloudSetup = { isCloudEnabled: true, instanceSizeMb: 1000 } as unknown as CloudSetup;
    const screenshotsInstance = getScreenshotsInstance();
    const hasInsufficient = screenshotsInstance.systemHasInsufficientMemory();
    expect(hasInsufficient).to.be(true);
  });

  it('ignores insufficient memory if cloud is not enabled', () => {
    mockCloudSetup = { isCloudEnabled: false, instanceSizeMb: 1000 } as unknown as CloudSetup;
    const screenshotsInstance = getScreenshotsInstance();
    const hasInsufficient = screenshotsInstance.systemHasInsufficientMemory();
    expect(hasInsufficient).to.be(false);
  });

  describe('getScreenshots', () => {
    beforeAll(() => {
      jest.mock('puppeteer'); // see __mocks__/puppeteer.ts
    });

    beforeEach(() => {
      browserDriverFactory.getBrowserLogger = jest.fn(() => Rx.of());
      browserDriverFactory.getProcessLogger = jest.fn(() => Rx.of());
      browserDriverFactory.getPageExit = jest.fn(() => Rx.of());
    });

    it('getScreenshots with PngScreenshotOptions', async () => {
      const screenshotsInstance = getScreenshotsInstance();

      const options: PngScreenshotOptions = {
        format: 'png',
        layout: { id: 'preserve_layout' },
        urls: ['/app/home/test'],
      };

      const observe = screenshotsInstance.getScreenshots(options);
      await firstValueFrom(observe).then((captureResult) => {
        expect(captureResult.results[0].screenshots[0].data).to.eql(
          Buffer.from(`you won't believe this one weird screenshot`, 'base64')
        );
        expect(captureResult.results[0].renderErrors).to.be(undefined);
        expect(captureResult.results[0].error).to.be(undefined);
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
      };

      const observe = screenshotsInstance.getScreenshots(options);
      await firstValueFrom(observe).then((captureResult) => {
        expect(captureResult.results[0].error?.message).to.be(
          `Screenshotting encountered a timeout error: "open URL" took longer than 0.01 seconds. You may need` +
            ` to increase "xpack.screenshotting.capture.timeouts.openUrl" in kibana.yml.`
        );
      });
    });
  });
});
