/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { config } from '.';
import { applyDeprecations, configDeprecationFactory } from '@kbn/config';
import { configDeprecationsMock } from '@kbn/core/server/mocks';

const CONFIG_PATH = 'xpack.actions';
const applyStackAlertDeprecations = (settings: Record<string, unknown> = {}) => {
  const deprecations = config.deprecations!(configDeprecationFactory);
  const deprecationMessages: string[] = [];
  const _config = {
    [CONFIG_PATH]: settings,
  };
  const { config: migrated, changedPaths } = applyDeprecations(
    _config,
    deprecations.map((deprecation) => ({
      deprecation,
      path: CONFIG_PATH,
      context: configDeprecationsMock.createContext(),
    })),
    () =>
      ({ message }) =>
        deprecationMessages.push(message)
  );
  return {
    messages: deprecationMessages,
    migrated,
    changedPaths,
  };
};

describe('index', () => {
  describe('deprecations', () => {
    it('should properly unset deprecated configs', () => {
      const { messages, changedPaths } = applyStackAlertDeprecations({
        proxyRejectUnauthorizedCertificates: false,
      });
      expect(changedPaths.unset).toStrictEqual([
        'xpack.actions.proxyRejectUnauthorizedCertificates',
      ]);
      expect(messages.length).toBe(1);
      expect(messages[0]).toBe(
        '"xpack.actions.proxyRejectUnauthorizedCertificates" is deprecated. Use "xpack.actions.ssl.proxyVerificationMode" instead, with the setting "proxyVerificationMode:full" eql to "rejectUnauthorized:true",and "proxyVerificationMode:none" eql to "rejectUnauthorized:false".'
      );
    });
  });
});
