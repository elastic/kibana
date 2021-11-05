/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from 'lodash';
import { durationToNumber } from '../../../common/schema_utils';
import { HeadlessChromiumDriver } from '../../browsers';
import {
  createMockBrowserDriverFactory,
  createMockConfig,
  createMockConfigSchema,
  createMockLayoutInstance,
  createMockLevelLogger,
  createMockReportingCore,
} from '../../test_helpers';
import { CaptureConfig } from '../../types';
import { LayoutInstance } from '../layouts';
import { LevelLogger } from '../level_logger';
import { getNumberOfItems } from './get_number_of_items';

describe('getNumberOfItems', () => {
  let captureConfig: CaptureConfig;
  let layout: LayoutInstance;
  let logger: jest.Mocked<LevelLogger>;
  let browser: HeadlessChromiumDriver;
  let timeout: number;

  beforeEach(async () => {
    const schema = createMockConfigSchema(set({}, 'capture.timeouts.waitForElements', 0));
    const config = createMockConfig(schema);
    const core = await createMockReportingCore(schema);

    captureConfig = config.get('capture');
    layout = createMockLayoutInstance(captureConfig);
    logger = createMockLevelLogger();
    timeout = durationToNumber(captureConfig.timeouts.waitForElements);

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
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should determine the number of items by attribute', async () => {
    document.body.innerHTML = `
      <div itemsSelector="10" />
    `;

    await expect(getNumberOfItems(timeout, browser, layout, logger)).resolves.toBe(10);
  });

  it('should determine the number of items by selector ', async () => {
    document.body.innerHTML = `
      <renderedSelector />
      <renderedSelector />
      <renderedSelector />
    `;

    await expect(getNumberOfItems(timeout, browser, layout, logger)).resolves.toBe(3);
  });

  it('should fall back to the selector when the attribute is empty', async () => {
    document.body.innerHTML = `
      <div itemsSelector />
      <renderedSelector />
      <renderedSelector />
    `;

    await expect(getNumberOfItems(timeout, browser, layout, logger)).resolves.toBe(2);
  });
});
