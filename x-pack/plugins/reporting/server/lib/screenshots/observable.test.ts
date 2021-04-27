/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('puppeteer', () => ({
  launch: () => ({
    // Fixme needs event emitters
    newPage: () => ({
      emulateTimezone: jest.fn(),
      setDefaultTimeout: jest.fn(),
    }),
    process: jest.fn(),
    close: jest.fn(),
  }),
}));

import moment from 'moment';
import * as Rx from 'rxjs';
import { HeadlessChromiumDriver } from '../../browsers';
import { ConditionalHeaders } from '../../export_types/common';
import {
  createMockBrowserDriverFactory,
  createMockConfig,
  createMockConfigSchema,
  createMockLayoutInstance,
  createMockLevelLogger,
} from '../../test_helpers';
import { ElementsPositionAndAttribute } from './';
import * as contexts from './constants';
import { screenshotsObservableFactory } from './observable';

/*
 * Mocks
 */
const logger = createMockLevelLogger();

const reportingConfig = {
  capture: {
    loadDelay: moment.duration(2, 's'),
    timeouts: {
      openUrl: moment.duration(2, 'm'),
      waitForElements: moment.duration(20, 's'),
      renderComplete: moment.duration(10, 's'),
    },
  },
};
const mockSchema = createMockConfigSchema(reportingConfig);
const mockConfig = createMockConfig(mockSchema);
const captureConfig = mockConfig.get('capture');
const mockLayout = createMockLayoutInstance(captureConfig);

/*
 * Tests
 */
describe('Screenshot Observable Pipeline', () => {
  let mockBrowserDriverFactory: any;

  beforeEach(async () => {
    mockBrowserDriverFactory = await createMockBrowserDriverFactory(logger, {});
  });

  it('pipelines a single url into screenshot and timeRange', async () => {
    const getScreenshots$ = screenshotsObservableFactory(captureConfig, mockBrowserDriverFactory);
    const result = await getScreenshots$({
      logger,
      urls: ['/welcome/home/start/index.htm'],
      conditionalHeaders: {} as ConditionalHeaders,
      layout: mockLayout,
      browserTimezone: 'UTC',
    }).toPromise();

    expect(result).toMatchInlineSnapshot(`
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
          "screenshots": Array [
            Object {
              "base64EncodedData": "allyourBase64",
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
    // mock implementations
    const mockScreenshot = jest.fn().mockImplementation((item: ElementsPositionAndAttribute) => {
      return Promise.resolve(`allyourBase64 screenshots`);
    });

    const mockOpen = jest.fn();

    // mocks
    mockBrowserDriverFactory = await createMockBrowserDriverFactory(logger, {
      screenshot: mockScreenshot,
      open: mockOpen,
    });

    // test
    const getScreenshots$ = screenshotsObservableFactory(captureConfig, mockBrowserDriverFactory);
    const result = await getScreenshots$({
      logger,
      urls: ['/welcome/home/start/index2.htm', '/welcome/home/start/index.php3?page=./home.php'],
      conditionalHeaders: {} as ConditionalHeaders,
      layout: mockLayout,
      browserTimezone: 'UTC',
    }).toPromise();

    expect(result).toMatchInlineSnapshot(`
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
          "screenshots": Array [
            Object {
              "base64EncodedData": "allyourBase64 screenshots",
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
          "screenshots": Array [
            Object {
              "base64EncodedData": "allyourBase64 screenshots",
              "description": "Default ",
              "title": "Default Mock Title",
            },
          ],
          "timeRange": "Default GetTimeRange Result",
        },
      ]
    `);

    // ensures the correct selectors are waited on for multi URL jobs
    expect(mockOpen.mock.calls.length).toBe(2);

    const firstSelector = mockOpen.mock.calls[0][1].waitForSelector;
    expect(firstSelector).toBe('.kbnAppWrapper');

    const secondSelector = mockOpen.mock.calls[1][1].waitForSelector;
    expect(secondSelector).toBe('[data-shared-page="2"]');
  });

  describe('error handling', () => {
    it('recovers if waitForSelector fails', async () => {
      // mock implementations
      const mockWaitForSelector = jest.fn().mockImplementation((selectorArg: string) => {
        throw new Error('Mock error!');
      });

      // mocks
      mockBrowserDriverFactory = await createMockBrowserDriverFactory(logger, {
        waitForSelector: mockWaitForSelector,
      });

      // test
      const getScreenshots$ = screenshotsObservableFactory(captureConfig, mockBrowserDriverFactory);
      const getScreenshot = async () => {
        return await getScreenshots$({
          logger,
          urls: [
            '/welcome/home/start/index2.htm',
            '/welcome/home/start/index.php3?page=./home.php3',
          ],
          conditionalHeaders: {} as ConditionalHeaders,
          layout: mockLayout,
          browserTimezone: 'UTC',
        }).toPromise();
      };

      await expect(getScreenshot()).resolves.toMatchInlineSnapshot(`
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
                  "error": [Error: An error occurred when trying to read the page for visualization panel info. You may need to increase 'xpack.reporting.capture.timeouts.waitForElements'. Error: Mock error!],
                  "screenshots": Array [
                    Object {
                      "base64EncodedData": "allyourBase64",
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
                  "error": [Error: An error occurred when trying to read the page for visualization panel info. You may need to increase 'xpack.reporting.capture.timeouts.waitForElements'. Error: Mock error!],
                  "screenshots": Array [
                    Object {
                      "base64EncodedData": "allyourBase64",
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
      // mocks
      const mockGetCreatePage = (driver: HeadlessChromiumDriver) =>
        jest
          .fn()
          .mockImplementation(() =>
            Rx.of({ driver, exit$: Rx.throwError('Instant timeout has fired!') })
          );

      const mockWaitForSelector = jest.fn().mockImplementation((selectorArg: string) => {
        return Rx.never().toPromise();
      });

      mockBrowserDriverFactory = await createMockBrowserDriverFactory(logger, {
        getCreatePage: mockGetCreatePage,
        waitForSelector: mockWaitForSelector,
      });

      // test
      const getScreenshots$ = screenshotsObservableFactory(captureConfig, mockBrowserDriverFactory);
      const getScreenshot = async () => {
        return await getScreenshots$({
          logger,
          urls: ['/welcome/home/start/index.php3?page=./home.php3'],
          conditionalHeaders: {} as ConditionalHeaders,
          layout: mockLayout,
          browserTimezone: 'UTC',
        }).toPromise();
      };

      await expect(getScreenshot()).rejects.toMatchInlineSnapshot(`"Instant timeout has fired!"`);
    });

    it(`uses defaults for element positions and size when Kibana page is not ready`, async () => {
      // mocks
      const mockBrowserEvaluate = jest.fn();
      mockBrowserEvaluate.mockImplementation(() => {
        const lastCallIndex = mockBrowserEvaluate.mock.calls.length - 1;
        const { context: mockCall } = mockBrowserEvaluate.mock.calls[lastCallIndex][1];

        if (mockCall === contexts.CONTEXT_ELEMENTATTRIBUTES) {
          return Promise.resolve(null);
        } else if (mockCall === contexts.CONTEXT_GETBROWSERDIMENSIONS) {
          return Promise.resolve([800, 600]);
        } else {
          return Promise.resolve();
        }
      });
      mockBrowserDriverFactory = await createMockBrowserDriverFactory(logger, {
        evaluate: mockBrowserEvaluate,
      });
      mockLayout.getViewport = () => null;

      // test
      const getScreenshots$ = screenshotsObservableFactory(captureConfig, mockBrowserDriverFactory);
      const getScreenshot = async () => {
        return await getScreenshots$({
          logger,
          urls: ['/welcome/home/start/index.php3?page=./home.php3'],
          conditionalHeaders: {} as ConditionalHeaders,
          layout: mockLayout,
          browserTimezone: 'UTC',
        }).toPromise();
      };

      await expect(getScreenshot()).resolves.toMatchInlineSnapshot(`
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
                          "width": 1800,
                        },
                        "scroll": Object {
                          "x": 0,
                          "y": 0,
                        },
                      },
                    },
                  ],
                  "error": undefined,
                  "screenshots": Array [
                    Object {
                      "base64EncodedData": "allyourBase64",
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
