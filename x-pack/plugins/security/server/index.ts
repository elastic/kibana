/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TypeOf } from '@kbn/config-schema';
import { RecursiveReadonly } from '@kbn/utility-types';
import {
  PluginConfigDescriptor,
  PluginInitializer,
  PluginInitializerContext,
} from '../../../../src/core/server';
import { ConfigSchema } from './config';
import { securityConfigDeprecationProvider } from './config_deprecations';
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
  GrantAPIKeyResult,
  SAMLLogin,
  OIDCLogin,
} from './authentication';
export {
  LegacyAuditLogger,
  AuditLogger,
  AuditEvent,
  EventCategory,
  EventType,
  EventOutcome,
} from './audit';
export { SecurityPluginSetup };
export { AuthenticatedUser } from '../common/model';

export const config: PluginConfigDescriptor<TypeOf<typeof ConfigSchema>> = {
  schema: ConfigSchema,
  deprecations: securityConfigDeprecationProvider,
  exposeToBrowser: {
    loginAssistanceMessage: true,
  },
};
export const plugin: PluginInitializer<
  RecursiveReadonly<SecurityPluginSetup>,
  void,
  PluginSetupDependencies
> = (initializerContext: PluginInitializerContext) => new Plugin(initializerContext);
