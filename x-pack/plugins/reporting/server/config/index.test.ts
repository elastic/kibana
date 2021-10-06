/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { config } from './index';
import { applyDeprecations, configDeprecationFactory } from '@kbn/config';
import { configDeprecationsMock } from '../../../../../src/core/server/mocks';

const CONFIG_PATH = 'xpack.reporting';

const deprecationContext = configDeprecationsMock.createContext();

const applyReportingDeprecations = (settings: Record<string, any> = {}) => {
  const deprecations = config.deprecations!(configDeprecationFactory);
  const deprecationMessages: string[] = [];
  const _config: any = {};
  _config[CONFIG_PATH] = settings;
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
  ['.foo', '.reporting'].forEach((index) => {
    it('logs a warning if index is set', () => {
      const { messages } = applyReportingDeprecations({ index, roles: { enabled: false } });
      expect(messages).toMatchInlineSnapshot(`
        Array [
          "Multitenancy by changing \\"kibana.index\\" will not be supported starting in 8.0. See https://ela.st/kbn-remove-legacy-multitenancy for more details",
        ]
      `);
    });
  });

  it('logs a warning if roles.enabled: true is set', () => {
    const { messages } = applyReportingDeprecations({ roles: { enabled: true } });
    expect(messages).toMatchInlineSnapshot(`
      Array [
        "Granting reporting privilege through a \\"reporting_user\\" role will not be supported starting in 8.0. Please set \\"xpack.reporting.roles.enabled\\" to \\"false\\" and grant reporting privileges to users using Kibana application privileges **Management > Security > Roles**.",
      ]
    `);
  });

  it('does not log a warning if roles.enabled: false is set', () => {
    const { messages } = applyReportingDeprecations({ roles: { enabled: false } });
    expect(messages).toMatchInlineSnapshot(`Array []`);
  });
});
