/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom, of, throwError } from 'rxjs';
import type { Logger } from 'src/core/server';
import type { ConfigType } from '../config';
import { createMockBrowserDriver, createMockBrowserDriverFactory } from '../browsers/mock';
import type { HeadlessChromiumDriverFactory } from '../browsers';
import * as Layouts from '../layouts/create_layout';
import { createMockLayout } from '../layouts/mock';
import { CONTEXT_ELEMENTATTRIBUTES } from './constants';
import { Screenshots, ScreenshotOptions } from '.';

/*
 * Tests
 */
describe('Screenshot Observable Pipeline', () => {
  let driver: ReturnType<typeof createMockBrowserDriver>;
  let driverFactory: jest.Mocked<HeadlessChromiumDriverFactory>;
  let layout: ReturnType<typeof createMockLayout>;
  let logger: jest.Mocked<Logger>;
  let options: ScreenshotOptions;
  let screenshots: Screenshots;

  beforeEach(async () => {
    driver = createMockBrowserDriver();
    driverFactory = createMockBrowserDriverFactory(driver);
    layout = createMockLayout();
    logger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    } as unknown as jest.Mocked<Logger>;
    options = {
      browserTimezone: 'UTC',
      headers: {},
      layout: {},
      timeouts: {
        loadDelay: 2000,
        openUrl: 120000,
        waitForElements: 20000,
        renderComplete: 10000,
      },
      urls: ['/welcome/home/start/index.htm'],
    } as unknown as typeof options;
    screenshots = new Screenshots(driverFactory, logger, { poolSize: 1 } as ConfigType);

    jest.spyOn(Layouts, 'createLayout').mockReturnValue(layout);

    driver.isPageOpen.mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('pipelines a single url into screenshot and timeRange', async () => {
    const result = await lastValueFrom(screenshots.getScreenshots(options));

    expect(result).toHaveProperty('results');
    expect(result.results).toMatchInlineSnapshot(`
      Array [
        Object {
          "elementsPositionAndAttributes": Array [
            Object {
              "attributes": Object {
                "description": "Default ",
                "title": "Default Mock Title",
              },
              "position": Object {
                "boundingClientRect": Object {
                  "height": 600,
                  "left": 0,
                  "top": 0,
                  "width": 800,
                },
                "scroll": Object {
                  "x": 0,
                  "y": 0,
                },
              },
            },
          ],
          "error": undefined,
          "renderErrors": undefined,
          "screenshots": Array [
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
              "description": "Default ",
              "title": "Default Mock Title",
            },
          ],
          "timeRange": "Default GetTimeRange Result",
        },
      ]
    `);
  });

  it('pipelines multiple urls into', async () => {
    driver.screenshot.mockResolvedValue(Buffer.from('some screenshots'));
    const result = await lastValueFrom(
      screenshots.getScreenshots({
        ...options,
        urls: ['/welcome/home/start/index2.htm', '/welcome/home/start/index.php3?page=./home.php'],
      })
    );

    expect(result).toHaveProperty('results');
    expect(result.results).toMatchInlineSnapshot(`
      Array [
        Object {
          "elementsPositionAndAttributes": Array [
            Object {
              "attributes": Object {
                "description": "Default ",
                "title": "Default Mock Title",
              },
              "position": Object {
                "boundingClientRect": Object {
                  "height": 600,
                  "left": 0,
                  "top": 0,
                  "width": 800,
                },
                "scroll": Object {
                  "x": 0,
                  "y": 0,
                },
              },
            },
          ],
          "error": undefined,
          "renderErrors": undefined,
          "screenshots": Array [
            Object {
              "data": Object {
                "data": Array [
                  115,
                  111,
                  109,
                  101,
                  32,
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
                  115,
                ],
                "type": "Buffer",
              },
              "description": "Default ",
              "title": "Default Mock Title",
            },
          ],
          "timeRange": "Default GetTimeRange Result",
        },
        Object {
          "elementsPositionAndAttributes": Array [
            Object {
              "attributes": Object {
                "description": "Default ",
                "title": "Default Mock Title",
              },
              "position": Object {
                "boundingClientRect": Object {
                  "height": 600,
                  "left": 0,
                  "top": 0,
                  "width": 800,
                },
                "scroll": Object {
                  "x": 0,
                  "y": 0,
                },
              },
            },
          ],
          "error": undefined,
          "renderErrors": undefined,
          "screenshots": Array [
            Object {
              "data": Object {
                "data": Array [
                  115,
                  111,
                  109,
                  101,
                  32,
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
                  115,
                ],
                "type": "Buffer",
              },
              "description": "Default ",
              "title": "Default Mock Title",
            },
          ],
          "timeRange": "Default GetTimeRange Result",
        },
      ]
    `);

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
        })
      );

      expect(result).toHaveProperty('results');
      expect(result.results).toMatchInlineSnapshot(`
        Array [
          Object {
            "elementsPositionAndAttributes": Array [
              Object {
                "attributes": Object {},
                "position": Object {
                  "boundingClientRect": Object {
                    "height": 100,
                    "left": 0,
                    "top": 0,
                    "width": 100,
                  },
                  "scroll": Object {
                    "x": 0,
                    "y": 0,
                  },
                },
              },
            ],
            "error": [Error: The "wait for elements" phase encountered an error: Error: An error occurred when trying to read the page for visualization panel info: Mock error!],
            "renderErrors": undefined,
            "screenshots": Array [
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
                "description": undefined,
                "title": undefined,
              },
            ],
            "timeRange": null,
          },
          Object {
            "elementsPositionAndAttributes": Array [
              Object {
                "attributes": Object {},
                "position": Object {
                  "boundingClientRect": Object {
                    "height": 100,
                    "left": 0,
                    "top": 0,
                    "width": 100,
                  },
                  "scroll": Object {
                    "x": 0,
                    "y": 0,
                  },
                },
              },
            ],
            "error": [Error: The "wait for elements" phase encountered an error: Error: An error occurred when trying to read the page for visualization panel info: Mock error!],
            "renderErrors": undefined,
            "screenshots": Array [
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
                "description": undefined,
                "title": undefined,
              },
            ],
            "timeRange": null,
          },
        ]
      `);
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
      const result = await lastValueFrom(screenshots.getScreenshots(options));

      expect(result).toHaveProperty('results');
      expect(result.results).toMatchInlineSnapshot(`
        Array [
          Object {
            "elementsPositionAndAttributes": Array [
              Object {
                "attributes": Object {},
                "position": Object {
                  "boundingClientRect": Object {
                    "height": 1200,
                    "left": 0,
                    "top": 0,
                    "width": 1950,
                  },
                  "scroll": Object {
                    "x": 0,
                    "y": 0,
                  },
                },
              },
            ],
            "error": undefined,
            "renderErrors": undefined,
            "screenshots": Array [
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
                "description": undefined,
                "title": undefined,
              },
            ],
            "timeRange": undefined,
          },
        ]
      `);
    });
  });
});
