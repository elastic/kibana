/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Page } from 'puppeteer';
import * as Rx from 'rxjs';
import { chromium, HeadlessChromiumDriver, HeadlessChromiumDriverFactory } from '../browsers';
import * as contexts from '../export_types/common/lib/screenshots/constants';
import { LevelLogger } from '../lib';
import { CaptureConfig, ElementsPositionAndAttribute } from '../types';

interface CreateMockBrowserDriverFactoryOpts {
  evaluate: jest.Mock<Promise<any>, any[]>;
  waitForSelector: jest.Mock<Promise<any>, any[]>;
  screenshot: jest.Mock<Promise<any>, any[]>;
  open: jest.Mock<Promise<any>, any[]>;
  getCreatePage: (driver: HeadlessChromiumDriver) => jest.Mock<any, any>;
}

const mockSelectors = {
  renderComplete: 'renderedSelector',
  itemsCountAttribute: 'itemsSelector',
  screenshot: 'screenshotSelector',
  timefilterDurationAttribute: 'timefilterDurationSelector',
  toastHeader: 'toastHeaderSelector',
};

const getMockElementsPositionAndAttributes = (
  title: string,
  description: string
): ElementsPositionAndAttribute[] => [
  {
    position: {
      boundingClientRect: { top: 0, left: 0, width: 800, height: 600 },
      scroll: { x: 0, y: 0 },
    },
    attributes: { title, description },
  },
];

const mockWaitForSelector = jest.fn();
mockWaitForSelector.mockImplementation((selectorArg: string) => {
  const { renderComplete, itemsCountAttribute, toastHeader } = mockSelectors;
  if (selectorArg === `${renderComplete},[${itemsCountAttribute}]`) {
    return Promise.resolve(true);
  } else if (selectorArg === toastHeader) {
    return Rx.never().toPromise();
  }
  throw new Error(selectorArg);
});
const mockBrowserEvaluate = jest.fn();
mockBrowserEvaluate.mockImplementation(() => {
  const lastCallIndex = mockBrowserEvaluate.mock.calls.length - 1;
  const { context: mockCall } = mockBrowserEvaluate.mock.calls[lastCallIndex][1];

  if (mockCall === contexts.CONTEXT_SKIPTELEMETRY) {
    return Promise.resolve();
  }
  if (mockCall === contexts.CONTEXT_GETNUMBEROFITEMS) {
    return Promise.resolve(1);
  }
  if (mockCall === contexts.CONTEXT_INJECTCSS) {
    return Promise.resolve();
  }
  if (mockCall === contexts.CONTEXT_WAITFORRENDER) {
    return Promise.resolve();
  }
  if (mockCall === contexts.CONTEXT_GETTIMERANGE) {
    return Promise.resolve('Default GetTimeRange Result');
  }
  if (mockCall === contexts.CONTEXT_ELEMENTATTRIBUTES) {
    return Promise.resolve(getMockElementsPositionAndAttributes('Default Mock Title', 'Default '));
  }
  throw new Error(mockCall);
});
const mockScreenshot = jest.fn();
mockScreenshot.mockImplementation((item: ElementsPositionAndAttribute) => {
  return Promise.resolve(`allyourBase64`);
});
const getCreatePage = (driver: HeadlessChromiumDriver) =>
  jest.fn().mockImplementation(() => Rx.of({ driver, exit$: Rx.never() }));

const defaultOpts: CreateMockBrowserDriverFactoryOpts = {
  evaluate: mockBrowserEvaluate,
  waitForSelector: mockWaitForSelector,
  screenshot: mockScreenshot,
  open: jest.fn(),
  getCreatePage,
};

export const createMockBrowserDriverFactory = async (
  logger: LevelLogger,
  opts: Partial<CreateMockBrowserDriverFactoryOpts> = {}
): Promise<HeadlessChromiumDriverFactory> => {
  const captureConfig: CaptureConfig = {
    timeouts: { openUrl: 30000, waitForElements: 30000, renderComplete: 30000 },
    browser: {
      type: 'chromium',
      chromium: {
        inspect: false,
        disableSandbox: false,
        proxy: { enabled: false, server: undefined, bypass: undefined },
      },
      autoDownload: false,
    },
    networkPolicy: { enabled: true, rules: [] },
    viewport: { width: 800, height: 600 },
    loadDelay: 2000,
    zoom: 2,
    maxAttempts: 1,
  };

  const binaryPath = '/usr/local/share/common/secure/super_awesome_binary';
  const mockBrowserDriverFactory = await chromium.createDriverFactory(
    binaryPath,
    captureConfig,
    logger
  );
  const mockPage = {} as Page;
  const mockBrowserDriver = new HeadlessChromiumDriver(mockPage, {
    inspect: true,
    networkPolicy: captureConfig.networkPolicy,
  });

  // mock the driver methods as either default mocks or passed-in
  mockBrowserDriver.waitForSelector = opts.waitForSelector ? opts.waitForSelector : defaultOpts.waitForSelector; // prettier-ignore
  mockBrowserDriver.evaluate = opts.evaluate ? opts.evaluate : defaultOpts.evaluate;
  mockBrowserDriver.screenshot = opts.screenshot ? opts.screenshot : defaultOpts.screenshot;
  mockBrowserDriver.open = opts.open ? opts.open : defaultOpts.open;

  mockBrowserDriverFactory.createPage = opts.getCreatePage
    ? opts.getCreatePage(mockBrowserDriver)
    : getCreatePage(mockBrowserDriver);

  return mockBrowserDriverFactory;
};
