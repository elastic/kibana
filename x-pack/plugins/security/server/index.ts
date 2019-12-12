/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TypeOf } from '@kbn/config-schema';
import {
  PluginConfigDescriptor,
  PluginInitializer,
  PluginInitializerContext,
  RecursiveReadonly,
} from '../../../../src/core/server';
import { ConfigSchema } from './config';
import { Plugin, SecurityPluginSetup, PluginSetupDependencies } from './plugin';

// These exports are part of public Security plugin contract, any change in signature of exported
// functions or removal of exports should be considered as a breaking change.
export {
  Authentication,
  AuthenticationResult,
  DeauthenticationResult,
  CreateAPIKeyResult,
  InvalidateAPIKeyParams,
  InvalidateAPIKeyResult,
  SAMLLogin,
  OIDCLogin,
} from './authentication';
export { SecurityPluginSetup };
export { AuthenticatedUser } from '../common/model';

export const config: PluginConfigDescriptor<TypeOf<typeof ConfigSchema>> = {
  schema: ConfigSchema,
  deprecations: ({ rename, unused }) => [
    rename('sessionTimeout', 'session.idleTimeout'),
    unused('authorization.legacyFallback.enabled'),
    // Deprecation transformation for the old array-based format of `xpack.security.authc.providers`.
    (settings, fromPath, log) => {
      const authcConfig = settings?.xpack?.security?.authc;
      if (!Array.isArray(authcConfig?.providers)) {
        return settings;
      }

      log(
        'Defining `xpack.security.authc.providers` as an array of provider types is deprecated. Use extended `object` format.'
      );

      const providerTypes = new Set(authcConfig.providers as string[]);
      authcConfig.providers = {};

      let order = 0;
      for (const providerType of providerTypes) {
        const isProviderWithAdditionalConfig = providerType === 'saml' || providerType === 'oidc';
        authcConfig.providers[providerType] = {
          [providerType]: isProviderWithAdditionalConfig
            ? { enabled: true, order, ...authcConfig[providerType] }
            : { enabled: true, order },
        };

        if (isProviderWithAdditionalConfig) {
          delete authcConfig[providerType];
        }

        order++;
      }

      return settings;
    },
    (settings, fromPath, log) => {
      const hasProviderType = (providerType: string) => {
        return Object.values(
          settings?.xpack?.security?.authc?.providers?.[providerType] || {}
        ).some(provider => (provider as { enabled: boolean | undefined })?.enabled !== false);
      };

      if (hasProviderType('basic') && hasProviderType('token')) {
        log(
          'Enabling both `basic` and `token` authentication providers in `xpack.security.authc.providers` is deprecated. Login page will only use `token` provider.'
        );
      }
      return settings;
    },
  ],
  exposeToBrowser: {
    loginAssistanceMessage: true,
  },
};
export const plugin: PluginInitializer<
  RecursiveReadonly<SecurityPluginSetup>,
  void,
  PluginSetupDependencies
> = (initializerContext: PluginInitializerContext) => new Plugin(initializerContext);
