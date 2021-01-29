/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { RecursiveReadonly } from '@kbn/utility-types';
import type {
  PluginConfigDescriptor,
  PluginInitializer,
  PluginInitializerContext,
} from '../../../../src/core/server';
import { ConfigSchema } from './config';
import { securityConfigDeprecationProvider } from './config_deprecations';
import {
  Plugin,
  SecurityPluginSetup,
  SecurityPluginStart,
  PluginSetupDependencies,
} from './plugin';

// These exports are part of public Security plugin contract, any change in signature of exported
// functions or removal of exports should be considered as a breaking change.
export type {
  CreateAPIKeyResult,
  InvalidateAPIKeysParams,
  InvalidateAPIKeyResult,
  GrantAPIKeyResult,
} from './authentication';
export {
  LegacyAuditLogger,
  AuditLogger,
  AuditEvent,
  EventCategory,
  EventType,
  EventOutcome,
} from './audit';
export type { SecurityPluginSetup, SecurityPluginStart };
export type { AuthenticatedUser } from '../common/model';

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
> = (initializerContext: PluginInitializerContext) => new Plugin(initializerContext);
