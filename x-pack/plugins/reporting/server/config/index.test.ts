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
  it('logs a warning if roles.enabled: true is set', () => {
    const { messages } = applyReportingDeprecations({ roles: { enabled: true } });
    expect(messages).toMatchInlineSnapshot(`
      Array [
        "The default mechanism for Reporting privileges will work differently in future versions, which will affect the behavior of this cluster. Set \\"xpack.reporting.roles.enabled\\" to \\"false\\" to adopt the future behavior before upgrading.",
      ]
    `);
  });

  it('does not log a warning if roles.enabled: false is set', () => {
    const { messages } = applyReportingDeprecations({ roles: { enabled: false } });
    expect(messages).toMatchInlineSnapshot(`Array []`);
  });
});
