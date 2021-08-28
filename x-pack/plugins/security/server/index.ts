/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import type { RecursiveReadonly } from '@kbn/utility-types';

import type {
  PluginConfigDescriptor,
  PluginInitializer,
  PluginInitializerContext,
} from '../../../../src/core/server/plugins/types';
import { ConfigSchema } from './config';
import { securityConfigDeprecationProvider } from './config_deprecations';
import type { PluginSetupDependencies, SecurityPluginSetup, SecurityPluginStart } from './plugin';
import { SecurityPlugin } from './plugin';

// These exports are part of public Security plugin contract, any change in signature of exported
// functions or removal of exports should be considered as a breaking change.
export type { AuthenticatedUser } from '../common/model';
export { AuditEvent, AuditLogger, AuditServiceSetup, LegacyAuditLogger } from './audit';
export type {
  AuthenticationServiceStart,
  CreateAPIKeyResult,
  GrantAPIKeyResult,
  InvalidateAPIKeyResult,
  InvalidateAPIKeysParams,
} from './authentication';
export type { CheckPrivilegesPayload } from './authorization';
export { ROUTE_TAG_CAN_REDIRECT } from './routes/tags';
export type { SecurityPluginSetup, SecurityPluginStart };
export type AuthorizationServiceSetup = SecurityPluginStart['authz'];

export const config: PluginConfigDescriptor<TypeOf<typeof ConfigSchema>> = {
  schema: ConfigSchema,
  deprecations: securityConfigDeprecationProvider,
  exposeToBrowser: {
    loginAssistanceMessage: true,
  },
};
export const plugin: PluginInitializer<
  RecursiveReadonly<SecurityPluginSetup>,
  RecursiveReadonly<SecurityPluginStart>,
  PluginSetupDependencies
> = (initializerContext: PluginInitializerContext) => new SecurityPlugin(initializerContext);
