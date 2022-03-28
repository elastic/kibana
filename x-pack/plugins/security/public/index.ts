/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from 'src/core/public';

import type {
  PluginSetupDependencies,
  PluginStartDependencies,
  SecurityPluginSetup,
  SecurityPluginStart,
} from './plugin';
import { SecurityPlugin } from './plugin';

export type { SecurityPluginSetup, SecurityPluginStart };
export type { AuthenticatedUser } from '../common/model';
export type { SecurityLicense, SecurityLicenseFeatures } from '../common/licensing';
export type { UserMenuLink, SecurityNavControlServiceStart } from '../public/nav_control';
export type { UiApi, ChangePasswordProps, PersonalInfoProps } from './ui_api';

export type { AuthenticationServiceStart, AuthenticationServiceSetup } from './authentication';

export const plugin: PluginInitializer<
  SecurityPluginSetup,
  SecurityPluginStart,
  PluginSetupDependencies,
  PluginStartDependencies
> = (initializerContext: PluginInitializerContext) => new SecurityPlugin(initializerContext);
