/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { AppDeepLinkId } from '@kbn/core-chrome-browser';
import type { CoreStart, ScopedHistory } from '@kbn/core/public';
import type { ServerlessPluginSetup, ServerlessPluginStart } from '@kbn/serverless/public';
import type { SolutionNavProps } from '@kbn/shared-ux-page-solution-nav';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchNavigationPluginSetup {}

export interface SearchNavigationPluginStart {
  registerOnAppMountHandler: (onAppMount: () => Promise<void>) => void;
  handleOnAppMount: () => Promise<void>;
  // This is temporary until we can migrate building the class nav item list out of `enterprise_search` plugin
  setGetBaseClassicNavItems: (classicNavItemsFn: () => ClassicNavItem[]) => void;
  useClassicNavigation: (history: ScopedHistory<unknown>) => SolutionNavProps | undefined;
}

export interface AppPluginSetupDependencies {
  serverless?: ServerlessPluginSetup;
}

export interface AppPluginStartDependencies {
  serverless?: ServerlessPluginStart;
}

export interface ClassicNavItemDeepLink {
  link: AppDeepLinkId;
  shouldShowActiveForSubroutes?: boolean;
}

export interface ClassicNavItem {
  'data-test-subj'?: string;
  deepLink?: ClassicNavItemDeepLink;
  iconToString?: string;
  id: string;
  items?: ClassicNavItem[];
  name?: ReactNode;
}

export type ClassicNavigationFactoryFn = (
  items: ClassicNavItem[],
  core: CoreStart,
  history: ScopedHistory<unknown>
) => SolutionNavProps | undefined;
