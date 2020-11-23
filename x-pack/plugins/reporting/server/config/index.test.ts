/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { config } from './index';
import { applyDeprecations, configDeprecationFactory } from '@kbn/config';

const CONFIG_PATH = 'kibana';

const applyReportingDeprecations = (settings: Record<string, any> = {}) => {
  const deprecations = config.deprecations!(configDeprecationFactory);
  const deprecationMessages: string[] = [];
  const _config: any = {};
  _config[CONFIG_PATH] = settings;
  const migrated = applyDeprecations(
    _config,
    deprecations.map((deprecation) => ({
      deprecation,
      path: CONFIG_PATH,
    })),
    (msg) => deprecationMessages.push(msg)
  );
  return {
    messages: deprecationMessages,
    migrated,
  };
};

describe('deprecations', () => {
  ['.foo', '.reporting'].forEach((index) => {
    it('logs a warning if index is set', () => {
      const { messages } = applyReportingDeprecations({ index });
      expect(messages).toMatchInlineSnapshot(`
        Array [
          "\\"xpack.reporting.index\\" is deprecated. Multitenancy by changing \\"kibana.index\\" will not be supported starting in 8.0. See https://ela.st/kbn-remove-legacy-multitenancy for more details",
        ]
      `);
    });
  });
});
