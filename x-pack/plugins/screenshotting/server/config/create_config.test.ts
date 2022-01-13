/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from 'src/core/server';
import { createConfig } from './create_config';
import { ConfigType } from './schema';

describe('createConfig$', () => {
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    logger = {
      debug: jest.fn(),
      get: jest.fn(() => logger),
      info: jest.fn(),
      warn: jest.fn(),
    } as unknown as typeof logger;
  });

  it('should use user-provided disableSandbox', async () => {
    const result = await createConfig(logger, {
      browser: { chromium: { disableSandbox: false } },
    } as ConfigType);

    expect(result).toHaveProperty('browser.chromium.disableSandbox', false);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('should provide a default for disableSandbox', async () => {
    const result = await createConfig(logger, { browser: { chromium: {} } } as ConfigType);

    expect(result).toHaveProperty('browser.chromium.disableSandbox', expect.any(Boolean));
    expect((logger.warn as any).mock.calls.length).toBe(0);
  });
});
