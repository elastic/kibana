/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HeadlessChromiumDriver } from '../../browsers';
import {
  createMockBrowserDriverFactory,
  createMockConfig,
  createMockConfigSchema,
  createMockLayoutInstance,
  createMockLevelLogger,
  createMockReportingCore,
} from '../../test_helpers';
import { LayoutInstance } from '../layouts';
import { getElementPositionAndAttributes } from './get_element_position_data';

describe('getElementPositionAndAttributes', () => {
  let layout: LayoutInstance;
  let logger: ReturnType<typeof createMockLevelLogger>;
  let browser: HeadlessChromiumDriver;

  beforeEach(async () => {
    const schema = createMockConfigSchema();
    const config = createMockConfig(schema);
    const captureConfig = config.get('capture');
    const core = await createMockReportingCore(schema);

    layout = createMockLayoutInstance(captureConfig);
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
        browser = driver;

        return jest.fn();
      },
    });

    // @see https://github.com/jsdom/jsdom/issues/653
    const querySelectorAll = document.querySelectorAll.bind(document);
    jest.spyOn(document, 'querySelectorAll').mockImplementation((selector) => {
      const elements = querySelectorAll<HTMLDivElement>(selector);

      elements.forEach((element) =>
        Object.assign(element, {
          getBoundingClientRect: () => ({
            width: parseFloat(element.style.width),
            height: parseFloat(element.style.height),
            top: parseFloat(element.style.top),
            left: parseFloat(element.style.left),
          }),
        })
      );

      return elements;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('should return elements positions', async () => {
    document.body.innerHTML = `
      <screenshotSelector
        style="display: block; position: absolute; top: 100px; left: 100px; width: 200px; height: 200px;"
        data-title="element1"
        data-description="some description 1"
      />
      <screenshotSelector
        style="position: absolute; top: 150px; left: 150px; width: 250px; height: 250px;"
        data-title="element1"
        data-description="some description 1"
      />
    `;

    await expect(getElementPositionAndAttributes(browser, layout, logger)).resolves
      .toMatchInlineSnapshot(`
            Array [
              Object {
                "attributes": Object {
                  "description": "some description 1",
                  "title": "element1",
                },
                "position": Object {
                  "boundingClientRect": Object {
                    "height": 200,
                    "left": 100,
                    "top": 100,
                    "width": 200,
                  },
                  "scroll": Object {
                    "x": 0,
                    "y": 0,
                  },
                },
              },
              Object {
                "attributes": Object {
                  "description": "some description 1",
                  "title": "element1",
                },
                "position": Object {
                  "boundingClientRect": Object {
                    "height": 250,
                    "left": 150,
                    "top": 150,
                    "width": 250,
                  },
                  "scroll": Object {
                    "x": 0,
                    "y": 0,
                  },
                },
              },
            ]
          `);
  });

  it('should return null when there are no elements matching', async () => {
    await expect(getElementPositionAndAttributes(browser, layout, logger)).resolves.toBeNull();
  });
});
