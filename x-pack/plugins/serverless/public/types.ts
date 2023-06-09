/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ManagementSetup, ManagementStart } from '@kbn/management-plugin/public';
import type {
  SideNavComponent,
  ChromeProjectNavigation,
  ChromeProjectBreadcrumb,
  ChromeSetProjectBreadcrumbsParams,
} from '@kbn/core-chrome-browser';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessPluginSetup {}

export interface ServerlessPluginStart {
  setSideNavComponent: (navigation: SideNavComponent) => void;
  setNavigation(projectNavigation: ChromeProjectNavigation): void;
  setBreadcrumbs: (
    breadcrumbs: ChromeProjectBreadcrumb | ChromeProjectBreadcrumb[],
    params?: Partial<ChromeSetProjectBreadcrumbsParams>
  ) => void;
}

export interface ServerlessPluginSetupDependencies {
  management: ManagementSetup;
}

export interface ServerlessPluginStartDependencies {
  management: ManagementStart;
}
