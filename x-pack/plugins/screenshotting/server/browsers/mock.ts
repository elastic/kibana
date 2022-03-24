/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NEVER, of } from 'rxjs';
import type { HeadlessChromiumDriver, HeadlessChromiumDriverFactory } from './chromium';
import {
  CONTEXT_SKIPTELEMETRY,
  CONTEXT_GETNUMBEROFITEMS,
  CONTEXT_INJECTCSS,
  CONTEXT_WAITFORRENDER,
  CONTEXT_GETTIMERANGE,
  CONTEXT_ELEMENTATTRIBUTES,
  CONTEXT_GETRENDERERRORS,
} from '../screenshots/constants';

const selectors = {
  renderComplete: 'renderedSelector',
  itemsCountAttribute: 'itemsSelector',
  screenshot: 'screenshotSelector',
  timefilterDurationAttribute: 'timefilterDurationSelector',
  toastHeader: 'toastHeaderSelector',
};

function getElementsPositionAndAttributes(title: string, description: string) {
  return [
    {
      position: {
        boundingClientRect: { top: 0, left: 0, width: 800, height: 600 },
        scroll: { x: 0, y: 0 },
      },
      attributes: { title, description },
    },
  ];
}

export function createMockBrowserDriver(): jest.Mocked<HeadlessChromiumDriver> {
  const evaluate = jest.fn(async (_, { context }) => {
    switch (context) {
      case CONTEXT_SKIPTELEMETRY:
      case CONTEXT_INJECTCSS:
      case CONTEXT_WAITFORRENDER:
      case CONTEXT_GETRENDERERRORS:
        return;
      case CONTEXT_GETNUMBEROFITEMS:
        return 1;
      case CONTEXT_GETTIMERANGE:
        return 'Default GetTimeRange Result';
      case CONTEXT_ELEMENTATTRIBUTES:
        return getElementsPositionAndAttributes('Default Mock Title', 'Default ');
    }

    throw new Error(context);
  });

  const screenshot = jest.fn(async () => Buffer.from('screenshot'));

  const waitForSelector = jest.fn(async (selectorArg: string) => {
    const { renderComplete, itemsCountAttribute, toastHeader } = selectors;

    if (selectorArg === `${renderComplete},[${itemsCountAttribute}]`) {
      return true;
    }

    if (selectorArg === toastHeader) {
      return NEVER.toPromise();
    }

    throw new Error(selectorArg);
  });

  return {
    evaluate,
    screenshot,
    waitForSelector,
    isPageOpen: jest.fn(),
    open: jest.fn(),
    setViewport: jest.fn(async () => {}),
    waitFor: jest.fn(),
  } as unknown as ReturnType<typeof createMockBrowserDriver>;
}

export function createMockBrowserDriverFactory(
  driver?: HeadlessChromiumDriver
): jest.Mocked<HeadlessChromiumDriverFactory> {
  return {
    createPage: jest.fn(() =>
      of({
        driver: driver ?? createMockBrowserDriver(),
        unexpectedExit$: NEVER,
        close: () => of({}),
      })
    ),
    diagnose: jest.fn(() => of('message')),
  } as unknown as ReturnType<typeof createMockBrowserDriverFactory>;
}
