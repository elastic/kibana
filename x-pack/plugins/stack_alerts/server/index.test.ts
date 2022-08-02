/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { config } from '.';
import { applyDeprecations, configDeprecationFactory } from '@kbn/config';
import { configDeprecationsMock } from '@kbn/core/server/mocks';

const CONFIG_PATH = 'xpack.stack_alerts';
const deprecationContext = configDeprecationsMock.createContext();

const applyStackAlertDeprecations = (settings: Record<string, unknown> = {}) => {
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

describe('index', () => {
  describe('deprecations', () => {
    it('should deprecate .enabled flag', () => {
      const { messages } = applyStackAlertDeprecations({ enabled: false });
      expect(messages).toMatchInlineSnapshot(`
        Array [
          "\\"xpack.stack_alerts.enabled\\" is deprecated. The ability to disable this plugin will be removed in 8.0.0.",
        ]
      `);
    });
  });
});
