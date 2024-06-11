/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps, FC } from 'react';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { ConsolePluginStart } from '@kbn/console-plugin/public';
import type { AppMountParameters, HttpStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { App } from './components/stack_app';

export interface SearchHomepageConfigType {
  ui: {
    enabled: boolean;
  };
}

export interface SearchHomepageAppInfo {
  appRoute: string;
  id: string;
  title: string;
}

export interface SearchHomepagePluginSetup {
  app: SearchHomepageAppInfo;
  isHomepageFeatureEnabled: () => boolean;
}

export interface SearchHomepagePluginStart {
  app: SearchHomepageAppInfo;
  isHomepageFeatureEnabled: () => boolean;
  SearchHomepage: FC<ComponentProps<typeof App>>;
}

export interface SearchHomepageAppPluginStartDependencies {
  history: AppMountParameters['history'];
  usageCollection?: UsageCollectionStart;
  share: SharePluginStart;
  console?: ConsolePluginStart;
}

export interface SearchHomepageServicesContext {
  http: HttpStart;
  share: SharePluginStart;
  cloud?: CloudSetup;
  usageCollection?: UsageCollectionStart;
  console?: ConsolePluginStart;
}
