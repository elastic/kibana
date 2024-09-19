/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HeadlessChromiumDriver } from '../../browsers';
import {
  createMockBrowserDriverFactory,
  createMockConfigSchema,
  createMockLevelLogger,
  createMockReportingCore,
} from '../../test_helpers';
import { getScreenshots } from './get_screenshots';

describe('getScreenshots', () => {
  const elementsPositionAndAttributes = [
    {
      attributes: { description: 'description1', title: 'title1' },
      position: {
        boundingClientRect: { top: 10, left: 10, height: 100, width: 100 },
        scroll: { x: 100, y: 100 },
      },
    },
    {
      attributes: { description: 'description2', title: 'title2' },
      position: {
        boundingClientRect: { top: 10, left: 10, height: 100, width: 100 },
        scroll: { x: 100, y: 100 },
      },
    },
  ];

  let logger: ReturnType<typeof createMockLevelLogger>;
  let browser: jest.Mocked<HeadlessChromiumDriver>;

  beforeEach(async () => {
    const core = await createMockReportingCore(createMockConfigSchema());

    logger = createMockLevelLogger();

    await createMockBrowserDriverFactory(core, logger, {
      evaluate: jest.fn(
        async <T extends (...args: unknown[]) => unknown>({
          fn,
          args,
        }: {
          fn: T;
          args: Parameters<T>;
        }) => fn(...args)
      ),
      getCreatePage: (driver) => {
        browser = driver as typeof browser;

        return jest.fn();
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return screenshots', async () => {
    await expect(getScreenshots(browser, elementsPositionAndAttributes, logger)).resolves
      .toMatchInlineSnapshot(`
            Array [
              Object {
                "data": Object {
                  "data": Array [
                    115,
                    99,
                    114,
                    101,
                    101,
                    110,
                    115,
                    104,
                    111,
                    116,
                  ],
                  "type": "Buffer",
                },
                "description": "description1",
                "title": "title1",
              },
              Object {
                "data": Object {
                  "data": Array [
                    115,
                    99,
                    114,
                    101,
                    101,
                    110,
                    115,
                    104,
                    111,
                    116,
                  ],
                  "type": "Buffer",
                },
                "description": "description2",
                "title": "title2",
              },
            ]
          `);
  });

  it('should forward elements positions', async () => {
    await getScreenshots(browser, elementsPositionAndAttributes, logger);

    expect(browser.screenshot).toHaveBeenCalledTimes(2);
    expect(browser.screenshot).toHaveBeenNthCalledWith(
      1,
      elementsPositionAndAttributes[0].position
    );
    expect(browser.screenshot).toHaveBeenNthCalledWith(
      2,
      elementsPositionAndAttributes[1].position
    );
  });

  it('should reject when the taken screenshot is empty', async () => {
    browser.screenshot.mockResolvedValue(Buffer.from(''));

    await expect(
      getScreenshots(browser, elementsPositionAndAttributes, logger)
    ).rejects.toBeInstanceOf(Error);
  });
});
