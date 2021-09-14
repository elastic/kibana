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
import { LevelLogger } from '../level_logger';
import { getTimeRange } from './get_time_range';

describe('getTimeRange', () => {
  let layout: LayoutInstance;
  let logger: jest.Mocked<LevelLogger>;
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
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should return null when there is no duration element', async () => {
    await expect(getTimeRange(browser, layout, logger)).resolves.toBeNull();
  });

  it('should return null when duration attrbute is empty', async () => {
    document.body.innerHTML = `
      <div timefilterDurationSelector />
    `;

    await expect(getTimeRange(browser, layout, logger)).resolves.toBeNull();
  });

  it('should return duration', async () => {
    document.body.innerHTML = `
      <div timefilterDurationSelector="10" />
    `;

    await expect(getTimeRange(browser, layout, logger)).resolves.toBe('10');
  });
});
