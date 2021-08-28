/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializer } from '../../../../src/core/public/plugins/plugin';
import type { PluginInitializerContext } from '../../../../src/core/public/plugins/plugin_context';
import type {
  PluginSetupDependencies,
  PluginStartDependencies,
  SecurityPluginSetup,
  SecurityPluginStart,
} from './plugin';
import { SecurityPlugin } from './plugin';

export { SecurityLicense, SecurityLicenseFeatures } from '../common/licensing';
export { AuthenticatedUser } from '../common/model';
export { SecurityNavControlServiceStart, UserMenuLink } from '../public/nav_control';
export { AuthenticationServiceSetup, AuthenticationServiceStart } from './authentication';
export { SecurityPluginSetup, SecurityPluginStart };

export const plugin: PluginInitializer<
  SecurityPluginSetup,
  SecurityPluginStart,
  PluginSetupDependencies,
  PluginStartDependencies
> = (initializerContext: PluginInitializerContext) => new SecurityPlugin(initializerContext);
