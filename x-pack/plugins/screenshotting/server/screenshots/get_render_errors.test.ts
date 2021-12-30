/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from 'src/core/server';
import { createMockBrowserDriver } from '../browsers/mock';
import { createMockLayout } from '../layouts/mock';
import { getRenderErrors } from './get_render_errors';

describe('getRenderErrors', () => {
  let browser: ReturnType<typeof createMockBrowserDriver>;
  let layout: ReturnType<typeof createMockLayout>;
  let logger: jest.Mocked<Logger>;

  beforeEach(async () => {
    browser = createMockBrowserDriver();
    layout = createMockLayout();
    logger = { debug: jest.fn(), warn: jest.fn() } as unknown as jest.Mocked<Logger>;

    browser.evaluate.mockImplementation(({ fn, args }) => (fn as Function)(...args));
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

    await expect(getRenderErrors(browser, logger, layout)).resolves.toEqual([
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

    await expect(getRenderErrors(browser, logger, layout)).resolves.toEqual(undefined);
  });
});
