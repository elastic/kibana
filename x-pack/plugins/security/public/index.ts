/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializer, PluginInitializerContext } from 'src/core/public';
import {
  SecurityPlugin,
  SecurityPluginSetup,
  SecurityPluginStart,
  PluginSetupDependencies,
  PluginStartDependencies,
} from './plugin';

export { SecurityPluginSetup, SecurityPluginStart };
export { AuthenticatedUser } from '../common/model';
export { SecurityLicense, SecurityLicenseFeatures } from '../common/licensing';
export { UserMenuLink } from '../public/nav_control';

export const plugin: PluginInitializer<
  SecurityPluginSetup,
  SecurityPluginStart,
  PluginSetupDependencies,
  PluginStartDependencies
> = (initializerContext: PluginInitializerContext) => new SecurityPlugin(initializerContext);
