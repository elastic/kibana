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
        customHostSettings: [{ ssl: { rejectUnauthorized: false } }],
        rejectUnauthorized: false,
        proxyRejectUnauthorizedCertificates: false,
      });
      expect(changedPaths.unset).toStrictEqual([
        'xpack.actions.customHostSettings.ssl.rejectUnauthorized',
        'xpack.actions.rejectUnauthorized',
        'xpack.actions.proxyRejectUnauthorizedCertificates',
      ]);
      expect(messages.length).toBe(3);
      expect(messages[0]).toBe(
        '"xpack.actions.customHostSettings[<index>].ssl.rejectUnauthorized" is deprecated.Use "xpack.actions.customHostSettings[<index>].ssl.verificationMode" instead, with the setting "verificationMode:full" eql to "rejectUnauthorized:true", and "verificationMode:none" eql to "rejectUnauthorized:false".'
      );
      expect(messages[1]).toBe(
        '"xpack.actions.rejectUnauthorized" is deprecated. Use "xpack.actions.ssl.verificationMode" instead, with the setting "verificationMode:full" eql to "rejectUnauthorized:true", and "verificationMode:none" eql to "rejectUnauthorized:false".'
      );
      expect(messages[2]).toBe(
        '"xpack.actions.proxyRejectUnauthorizedCertificates" is deprecated. Use "xpack.actions.ssl.proxyVerificationMode" instead, with the setting "proxyVerificationMode:full" eql to "rejectUnauthorized:true",and "proxyVerificationMode:none" eql to "rejectUnauthorized:false".'
      );
    });
  });
});
