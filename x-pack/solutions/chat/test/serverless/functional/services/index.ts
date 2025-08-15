/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GenericFtrProviderContext } from '@kbn/test';
import { services as svlPlatformServices } from '@kbn/test-suites-xpack-platform/serverless/functional/services';
import { SvlChatNavigationServiceProvider } from './svl_chat_navigation';

export const services = {
  ...svlPlatformServices,
  // Chat Solution serverless FTR services
  svlChatNavigation: SvlChatNavigationServiceProvider,
};

export type InheritedFtrProviderContext = GenericFtrProviderContext<typeof services, {}>;

export type InheritedServices = InheritedFtrProviderContext extends GenericFtrProviderContext<
  infer TServices,
  {}
>
  ? TServices
  : {};

export type { SupertestWithRoleScopeType } from '@kbn/test-suites-xpack-platform/serverless/shared/services';
