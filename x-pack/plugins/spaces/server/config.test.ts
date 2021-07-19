/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyDeprecations, configDeprecationFactory } from '@kbn/config';
import { deepFreeze } from '@kbn/std';

import { spacesConfigDeprecationProvider } from './config';

const applyConfigDeprecations = (settings: Record<string, any> = {}) => {
  const deprecations = spacesConfigDeprecationProvider(configDeprecationFactory);
  const deprecationMessages: string[] = [];
  const { config: migrated } = applyDeprecations(
    settings,
    deprecations.map((deprecation) => ({
      deprecation,
      path: '',
    })),
    () => ({ message }) => deprecationMessages.push(message)
  );
  return {
    messages: deprecationMessages,
    migrated,
  };
};

describe('spaces config', () => {
  describe('deprecations', () => {
    describe('enabled', () => {
      it('logs a warning if xpack.spaces.enabled is set to false', () => {
        const originalConfig = deepFreeze({ xpack: { spaces: { enabled: false } } });

        const { messages, migrated } = applyConfigDeprecations({ ...originalConfig });

        expect(messages).toMatchInlineSnapshot(`
        Array [
          "Disabling the Spaces plugin (xpack.spaces.enabled) will not be supported in the next major version (8.0)",
        ]
      `);
        expect(migrated).toEqual(originalConfig);
      });

      it('does not log a warning if no settings are explicitly set', () => {
        const originalConfig = deepFreeze({});

        const { messages, migrated } = applyConfigDeprecations({ ...originalConfig });

        expect(messages).toMatchInlineSnapshot(`Array []`);
        expect(migrated).toEqual(originalConfig);
      });

      it('does not log a warning if xpack.spaces.enabled is set to true', () => {
        const originalConfig = deepFreeze({ xpack: { spaces: { enabled: true } } });

        const { messages, migrated } = applyConfigDeprecations({ ...originalConfig });

        expect(messages).toMatchInlineSnapshot(`Array []`);
        expect(migrated).toEqual(originalConfig);
      });
    });
  });
});
