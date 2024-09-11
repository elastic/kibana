/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConsolePluginStart } from '@kbn/console-plugin/public';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';

export interface SearchIndicesPluginSetup {
  enabled: boolean;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchIndicesPluginStart {}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}

export interface SearchIndicesAppPluginStartDependencies {
  console?: ConsolePluginStart;
  share: SharePluginStart;
  usageCollection?: UsageCollectionStart;
}

export type SearchIndicesServicesContext = CoreStart &
  SearchIndicesAppPluginStartDependencies & {
    history: AppMountParameters['history'];
  };

export interface AppUsageTracker {
  click: (eventName: string | string[]) => void;
  count: (eventName: string | string[]) => void;
  load: (eventName: string | string[]) => void;
}
