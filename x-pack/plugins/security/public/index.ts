/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import type { SecurityPluginSetup } from '@kbn/security-plugin-types-public';

import type {
  PluginSetupDependencies,
  PluginStartDependencies,
  SecurityPluginStart,
} from './plugin';
import { SecurityPlugin } from './plugin';

export type { SecurityPluginStart, SecurityPluginSetup };
export type { AuthenticatedUser, SecurityLicenseFeatures, SecurityLicense } from '../common';
export type { UiApi, ChangePasswordProps, PersonalInfoProps } from './ui_api';

export { ALL_SPACES_ID } from '../common/constants';

// Re-export types from the plugin directly to enhance the developer experience for consumers of the Security plugin.
export type {
  AuthenticationServiceStart,
  AuthenticationServiceSetup,
  AuthorizationServiceStart,
  AuthorizationServiceSetup,
  SecurityNavControlServiceStart,
  UserMenuLink,
  UserProfileBulkGetParams,
  UserProfileGetCurrentParams,
  UserProfileSuggestParams,
} from '@kbn/security-plugin-types-public';

export const plugin: PluginInitializer<
  SecurityPluginSetup,
  SecurityPluginStart,
  PluginSetupDependencies,
  PluginStartDependencies
> = (initializerContext: PluginInitializerContext) => new SecurityPlugin(initializerContext);
