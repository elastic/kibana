/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import puppeteer from 'puppeteer';
import * as Rx from 'rxjs';
import { take } from 'rxjs/operators';
import { HeadlessChromiumDriverFactory } from '.';
import type { ReportingCore } from '../../..';
import {
  createMockConfigSchema,
  createMockLevelLogger,
  createMockReportingCore,
} from '../../../test_helpers';

jest.mock('puppeteer');

const mock = (browserDriverFactory: HeadlessChromiumDriverFactory) => {
  browserDriverFactory.getBrowserLogger = jest.fn(() => new Rx.Observable());
  browserDriverFactory.getProcessLogger = jest.fn(() => new Rx.Observable());
  browserDriverFactory.getPageExit = jest.fn(() => new Rx.Observable());
  return browserDriverFactory;
};

describe('class HeadlessChromiumDriverFactory', () => {
  let reporting: ReportingCore;
  const logger = createMockLevelLogger();
  const path = 'path/to/headless_shell';

  beforeEach(async () => {
    (puppeteer as jest.Mocked<typeof puppeteer>).launch.mockResolvedValue({
      newPage: jest.fn().mockResolvedValue({
        target: jest.fn(() => ({
          createCDPSession: jest.fn().mockResolvedValue({
            send: jest.fn(),
          }),
        })),
        emulateTimezone: jest.fn(),
        setDefaultTimeout: jest.fn(),
      }),
      close: jest.fn(),
      process: jest.fn(),
    } as unknown as puppeteer.Browser);

    reporting = await createMockReportingCore(
      createMockConfigSchema({
        capture: {
          browser: { chromium: { proxy: {} } },
          timeouts: { openUrl: 50000 },
        },
      })
    );
  });

  it('createPage returns browser driver and process exit observable', async () => {
    const factory = mock(new HeadlessChromiumDriverFactory(reporting, path, logger));
    const utils = await factory.createPage({}).pipe(take(1)).toPromise();
    expect(utils).toHaveProperty('driver');
    expect(utils).toHaveProperty('exit$');
  });

  it('createPage rejects if Puppeteer launch fails', async () => {
    (puppeteer as jest.Mocked<typeof puppeteer>).launch.mockRejectedValue(
      `Puppeteer Launch mock fail.`
    );
    const factory = mock(new HeadlessChromiumDriverFactory(reporting, path, logger));
    expect(() =>
      factory.createPage({}).pipe(take(1)).toPromise()
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Error spawning Chromium browser! Puppeteer Launch mock fail."`
    );
  });
});
