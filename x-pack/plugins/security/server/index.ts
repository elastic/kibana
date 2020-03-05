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
} from './authentication';
export { SecurityPluginSetup };
export { AuthenticatedUser } from '../common/model';

export const config: PluginConfigDescriptor<TypeOf<typeof ConfigSchema>> = {
  schema: ConfigSchema,
  deprecations: ({ rename, unused }) => [
    rename('sessionTimeout', 'session.idleTimeout'),
    unused('authorization.legacyFallback.enabled'),
    (settings, fromPath, log) => {
      const hasProvider = (provider: string) =>
        settings?.xpack?.security?.authc?.providers?.includes(provider) ?? false;

      if (hasProvider('basic') && hasProvider('token')) {
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
