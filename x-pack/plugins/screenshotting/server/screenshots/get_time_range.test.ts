/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from 'src/core/server';
import { createMockBrowserDriver } from '../browsers/mock';
import { createMockLayout } from '../layouts/mock';
import { getTimeRange } from './get_time_range';

describe('getTimeRange', () => {
  let browser: ReturnType<typeof createMockBrowserDriver>;
  let layout: ReturnType<typeof createMockLayout>;
  let logger: jest.Mocked<Logger>;

  beforeEach(async () => {
    browser = createMockBrowserDriver();
    layout = createMockLayout();
    logger = { debug: jest.fn(), info: jest.fn() } as unknown as jest.Mocked<Logger>;

    browser.evaluate.mockImplementation(({ fn, args }) => (fn as Function)(...args));
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should return null when there is no duration element', async () => {
    await expect(getTimeRange(browser, logger, layout)).resolves.toBeNull();
  });

  it('should return null when duration attrbute is empty', async () => {
    document.body.innerHTML = `
      <div timefilterDurationSelector />
    `;

    await expect(getTimeRange(browser, logger, layout)).resolves.toBeNull();
  });

  it('should return duration', async () => {
    document.body.innerHTML = `
      <div timefilterDurationSelector="10" />
    `;

    await expect(getTimeRange(browser, logger, layout)).resolves.toBe('10');
  });
});
