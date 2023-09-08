/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ChromeProjectBreadcrumb,
  ChromeProjectNavigation,
  ChromeSetProjectBreadcrumbsParams,
  SideNavComponent,
  ChromeProjectNavigationNode,
} from '@kbn/core-chrome-browser';
import type { ManagementSetup, ManagementStart } from '@kbn/management-plugin/public';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { Observable } from 'rxjs';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessPluginSetup {}

export interface ServerlessPluginStart {
  setBreadcrumbs: (
    breadcrumbs: ChromeProjectBreadcrumb | ChromeProjectBreadcrumb[],
    params?: Partial<ChromeSetProjectBreadcrumbsParams>
  ) => void;
  setNavigation(projectNavigation: ChromeProjectNavigation): void;
  setProjectHome(homeHref: string): void;
  setSideNavComponent: (navigation: SideNavComponent) => void;
  getActiveNavigationNodes$: () => Observable<ChromeProjectNavigationNode[][]>;
}

export interface ServerlessPluginSetupDependencies {
  management: ManagementSetup;
  cloud: CloudSetup;
}

export interface ServerlessPluginStartDependencies {
  management: ManagementStart;
  cloud: CloudStart;
}
