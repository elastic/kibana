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
import { CaptureConfig } from '../../types';
import { LayoutInstance } from '../layouts';
import { LevelLogger } from '../level_logger';
import { getRenderErrors } from './get_render_errors';

describe('getRenderErrors', () => {
  let captureConfig: CaptureConfig;
  let layout: LayoutInstance;
  let logger: jest.Mocked<LevelLogger>;
  let browser: HeadlessChromiumDriver;

  beforeEach(async () => {
    const schema = createMockConfigSchema();
    const config = createMockConfig(schema);
    const core = await createMockReportingCore(schema);

    captureConfig = config.get('capture');
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

  it('should extract the error messages', async () => {
    document.body.innerHTML = `
      <div dataRenderErrorSelector="a test error" />
      <div dataRenderErrorSelector="a test error" />
      <div dataRenderErrorSelector="a test error" />
      <div dataRenderErrorSelector="a test error" />
    `;

    await expect(getRenderErrors(browser, layout, logger)).resolves.toEqual([
      'a test error',
      'a test error',
      'a test error',
      'a test error',
    ]);
  });

  it('should extract the error messages, even when there are none', async () => {
    document.body.innerHTML = `
      <renderedSelector />
    `;

    await expect(getRenderErrors(browser, layout, logger)).resolves.toEqual(undefined);
  });
});
