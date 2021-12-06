/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { config } from './index';
import { applyDeprecations, configDeprecationFactory } from '@kbn/config';
import { configDeprecationsMock } from '../../../../src/core/server/mocks';

const CONFIG_PATH = 'xpack.task_manager';

const deprecationContext = configDeprecationsMock.createContext();

const applyTaskManagerDeprecations = (settings: Record<string, unknown> = {}) => {
  const deprecations = config.deprecations!(configDeprecationFactory);
  const deprecationMessages: string[] = [];
  const _config = {
    [CONFIG_PATH]: settings,
  };
  const { config: migrated } = applyDeprecations(
    _config,
    deprecations.map((deprecation) => ({
      deprecation,
      path: CONFIG_PATH,
      context: deprecationContext,
    })),
    () =>
      ({ message }) =>
        deprecationMessages.push(message)
  );
  return {
    messages: deprecationMessages,
    migrated,
  };
};

describe('deprecations', () => {
  it('logs a warning if max_workers is over limit', () => {
    const { messages } = applyTaskManagerDeprecations({ max_workers: 1000 });
    expect(messages).toMatchInlineSnapshot(`
      Array [
        "setting \\"xpack.task_manager.max_workers\\" (1000) greater than 100 is deprecated.",
      ]
    `);
  });
});
